package com.smartiq.backend.room;

import com.smartiq.backend.config.RoomProperties;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Pattern;

@Service
public class RoomService {

    private static final int MAX_PLAYERS = 8;
    private static final int ROOM_CODE_LENGTH = 6;
    private static final String ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String DEFAULT_HOST_NAME = "Host";
    private static final int MAX_DISPLAY_NAME_LENGTH = 64;
    private static final int MAX_PLAYER_ID_LENGTH = 64;
    private static final int MAX_AUTH_TOKEN_LENGTH = 128;
    private static final Pattern PLAYER_ID_PATTERN = Pattern.compile("^p[1-9][0-9]*$");
    private static final Pattern ROOM_TOKEN_PATTERN = Pattern.compile("^rt_[a-f0-9]{32}$");
    private static final String METRIC_ROOM_CREATE = "smartiq.room.create.total";
    private static final String METRIC_ROOM_JOIN = "smartiq.room.join.total";
    private static final String METRIC_ROOM_REJOIN = "smartiq.room.rejoin.total";
    private static final String METRIC_ROOM_EVICTED = "smartiq.room.evicted.total";
    private static final int DEFAULT_ROOM_RETENTION_MINUTES = 180;
    private static final int DEFAULT_ROOM_MAX = 20000;

    private final MeterRegistry meterRegistry;
    private final Clock clock;
    private final long roomRetentionMillis;
    private final int roomMax;
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentMap<String, RoomState> rooms = new ConcurrentHashMap<>();

    @Autowired
    public RoomService(MeterRegistry meterRegistry, RoomProperties roomProperties) {
        this(meterRegistry, roomProperties, Clock.systemUTC());
    }

    RoomService(MeterRegistry meterRegistry, RoomProperties roomProperties, Clock clock) {
        this.meterRegistry = meterRegistry;
        this.clock = clock;
        int retentionMinutes = roomProperties == null
                ? DEFAULT_ROOM_RETENTION_MINUTES
                : roomProperties.roomRetentionMinutes();
        this.roomRetentionMillis = Math.max(1, retentionMinutes) * 60_000L;
        int configuredRoomMax = roomProperties == null
                ? DEFAULT_ROOM_MAX
                : roomProperties.roomMax();
        this.roomMax = Math.max(1, configuredRoomMax);
    }

    RoomService(MeterRegistry meterRegistry) {
        this(
                meterRegistry,
                new RoomProperties(DEFAULT_ROOM_RETENTION_MINUTES, DEFAULT_ROOM_MAX),
                Clock.systemUTC()
        );
    }

    public synchronized RoomParticipantResponse createRoom(CreateRoomRequest request) {
        try {
            evictExpiredRooms();
            evictOldestUntilCapacityAvailable();
            String displayName = normalizeDisplayName(request == null ? null : request.displayName(), DEFAULT_HOST_NAME);
            String roomCode = allocateUniqueRoomCode();
            long nowMillis = nowMillis();

            RoomState room = new RoomState(roomCode);
            String playerId = room.addPlayer(displayName);
            String authToken = issueToken();
            room.playerTokens.put(playerId, authToken);
            room.lastTouchedAtMillis = nowMillis;
            rooms.put(roomCode, room);

            incrementCounter(METRIC_ROOM_CREATE, "success", "none");
            return new RoomParticipantResponse(roomCode, playerId, authToken);
        } catch (RuntimeException ex) {
            incrementCounter(METRIC_ROOM_CREATE, "failure", "internal_error");
            throw ex;
        }
    }

    public synchronized RoomParticipantResponse joinRoom(String roomCode, JoinRoomRequest request) {
        try {
            evictExpiredRooms();
            RoomState room = requireRoom(roomCode);
            if (room.players.size() >= MAX_PLAYERS) {
                throw new IllegalArgumentException("room is full");
            }

            String fallbackName = "Player " + (room.players.size() + 1);
            String displayName = normalizeDisplayName(request == null ? null : request.displayName(), fallbackName);
            String playerId = room.addPlayer(displayName);
            String authToken = issueToken();
            room.playerTokens.put(playerId, authToken);
            room.lastTouchedAtMillis = nowMillis();

            incrementCounter(METRIC_ROOM_JOIN, "success", "none");
            return new RoomParticipantResponse(room.code, playerId, authToken);
        } catch (RuntimeException ex) {
            incrementCounter(METRIC_ROOM_JOIN, "failure", classifyJoinFailure(ex));
            throw ex;
        }
    }

    public synchronized RoomSnapshot getRoomSnapshot(String roomCode) {
        evictExpiredRooms();
        RoomState room = requireRoom(roomCode);
        room.lastTouchedAtMillis = nowMillis();
        return toSnapshot(room);
    }

    public synchronized RoomResumeResponse rejoinRoom(String roomCode, RejoinRoomRequest request) {
        try {
            evictExpiredRooms();
            if (request == null) {
                throw new IllegalArgumentException("rejoin payload is required");
            }

            RoomState room = requireRoom(roomCode);
            String playerId = normalizePlayerId(request.playerId());
            String authToken = normalizeAuthToken(request.authToken());
            String expectedToken = room.playerTokens.get(playerId);
            if (expectedToken == null) {
                throw new NoSuchElementException("player not found: " + playerId);
            }
            if (!secureEquals(expectedToken, authToken)) {
                throw new IllegalArgumentException("invalid room token");
            }
            room.lastTouchedAtMillis = nowMillis();

            incrementCounter(METRIC_ROOM_REJOIN, "success", "none");
            return new RoomResumeResponse(room.code, playerId, authToken, toSnapshot(room));
        } catch (RuntimeException ex) {
            incrementCounter(METRIC_ROOM_REJOIN, "failure", classifyRejoinFailure(ex));
            throw ex;
        }
    }

    private RoomState requireRoom(String roomCode) {
        String normalized = normalizeRoomCode(roomCode);
        RoomState room = rooms.get(normalized);
        if (room == null) {
            throw new NoSuchElementException("room not found: " + normalized);
        }
        if (isExpired(room, nowMillis())) {
            rooms.remove(normalized, room);
            incrementEvictedCounter("expired");
            throw new NoSuchElementException("room not found: " + normalized);
        }
        return room;
    }

    private long nowMillis() {
        return clock.millis();
    }

    private void evictExpiredRooms() {
        long nowMillis = nowMillis();
        for (Map.Entry<String, RoomState> entry : rooms.entrySet()) {
            String roomCode = entry.getKey();
            RoomState room = entry.getValue();
            if (room == null || !isExpired(room, nowMillis)) {
                continue;
            }
            if (rooms.remove(roomCode, room)) {
                incrementEvictedCounter("expired");
            }
        }
    }

    private void evictOldestUntilCapacityAvailable() {
        while (rooms.size() >= roomMax) {
            Map.Entry<String, RoomState> oldest = rooms.entrySet().stream()
                    .min(Comparator.comparingLong(entry -> entry.getValue().lastTouchedAtMillis))
                    .orElse(null);
            if (oldest == null) {
                return;
            }
            if (rooms.remove(oldest.getKey(), oldest.getValue())) {
                incrementEvictedCounter("capacity");
            }
        }
    }

    private boolean isExpired(RoomState room, long nowMillis) {
        return nowMillis - room.lastTouchedAtMillis >= roomRetentionMillis;
    }

    private String allocateUniqueRoomCode() {
        for (int attempt = 0; attempt < 50; attempt += 1) {
            String candidate = randomRoomCode();
            if (!rooms.containsKey(candidate)) {
                return candidate;
            }
        }

        // Keep fallback constrained to the same allowed room-code alphabet.
        String fallback = randomRoomCode();
        if (!rooms.containsKey(fallback)) {
            return fallback;
        }
        throw new IllegalStateException("failed to allocate room code");
    }

    private String randomRoomCode() {
        StringBuilder code = new StringBuilder(ROOM_CODE_LENGTH);
        for (int index = 0; index < ROOM_CODE_LENGTH; index += 1) {
            int alphabetIndex = random.nextInt(ROOM_CODE_ALPHABET.length());
            code.append(ROOM_CODE_ALPHABET.charAt(alphabetIndex));
        }
        return code.toString();
    }

    private static String normalizeRoomCode(String roomCode) {
        if (roomCode == null || roomCode.isBlank()) {
            throw new IllegalArgumentException("room code is required");
        }
        String normalized = roomCode.trim().toUpperCase(Locale.ROOT);
        if (!isValidRoomCode(normalized)) {
            throw new IllegalArgumentException("room code format is invalid");
        }
        return normalized;
    }

    private static boolean isValidRoomCode(String roomCode) {
        if (roomCode.length() != ROOM_CODE_LENGTH) {
            return false;
        }
        for (int index = 0; index < roomCode.length(); index += 1) {
            if (ROOM_CODE_ALPHABET.indexOf(roomCode.charAt(index)) < 0) {
                return false;
            }
        }
        return true;
    }

    private static String normalizeDisplayName(String displayName, String fallbackName) {
        if (displayName == null || displayName.isBlank()) {
            return fallbackName;
        }
        String normalized = displayName.trim();
        if (normalized.length() > MAX_DISPLAY_NAME_LENGTH) {
            throw new IllegalArgumentException("displayName is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("displayName contains control characters");
        }
        return normalized;
    }

    private static String normalizePlayerId(String playerId) {
        if (playerId == null || playerId.isBlank()) {
            throw new IllegalArgumentException("playerId is required");
        }
        String normalized = playerId.trim();
        if (normalized.length() > MAX_PLAYER_ID_LENGTH) {
            throw new IllegalArgumentException("playerId is too long");
        }
        if (!PLAYER_ID_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("playerId format is invalid");
        }
        int playerNumber;
        try {
            playerNumber = Integer.parseInt(normalized.substring(1));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("playerId format is invalid");
        }
        if (playerNumber < 1 || playerNumber > MAX_PLAYERS) {
            throw new IllegalArgumentException("playerId format is invalid");
        }
        return normalized;
    }

    private static String normalizeAuthToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new IllegalArgumentException("authToken is required");
        }
        String normalized = authToken.trim();
        if (normalized.length() > MAX_AUTH_TOKEN_LENGTH) {
            throw new IllegalArgumentException("authToken is too long");
        }
        if (!ROOM_TOKEN_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("invalid room token");
        }
        return normalized;
    }

    private static String issueToken() {
        return "rt_" + UUID.randomUUID().toString().replace("-", "");
    }

    private static boolean secureEquals(String expected, String provided) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }

    private static boolean containsControlChars(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl((char) ch));
    }

    private void incrementCounter(String metricName, String result, String reason) {
        meterRegistry.counter(metricName, "result", result, "reason", reason).increment();
    }

    private void incrementEvictedCounter(String reason) {
        meterRegistry.counter(METRIC_ROOM_EVICTED, "reason", reason).increment();
    }

    private static String classifyJoinFailure(RuntimeException ex) {
        String message = normalizeMessage(ex);
        if (ex instanceof NoSuchElementException && message.contains("room not found")) {
            return "room_not_found";
        }
        if (ex instanceof IllegalArgumentException) {
            if (message.contains("room is full")) {
                return "room_full";
            }
            if (message.contains("room code is required")) {
                return "invalid_room_code";
            }
            if (message.contains("room code format is invalid")) {
                return "invalid_room_code";
            }
            return "invalid_request";
        }
        return "internal_error";
    }

    private static String classifyRejoinFailure(RuntimeException ex) {
        String message = normalizeMessage(ex);
        if (ex instanceof NoSuchElementException) {
            if (message.contains("room not found")) {
                return "room_not_found";
            }
            if (message.contains("player not found")) {
                return "player_not_found";
            }
        }
        if (ex instanceof IllegalArgumentException) {
            if (message.contains("invalid room token")) {
                return "invalid_room_token";
            }
            if (message.contains("authtoken is required")) {
                return "missing_auth_token";
            }
            if (message.contains("playerid is required")) {
                return "missing_player_id";
            }
            if (message.contains("playerid format is invalid")) {
                return "invalid_player_id";
            }
            if (message.contains("room code is required")) {
                return "invalid_room_code";
            }
            if (message.contains("room code format is invalid")) {
                return "invalid_room_code";
            }
            if (message.contains("rejoin payload is required")) {
                return "invalid_payload";
            }
            return "invalid_request";
        }
        return "internal_error";
    }

    private static String normalizeMessage(RuntimeException ex) {
        if (ex.getMessage() == null) {
            return "";
        }
        return ex.getMessage().trim().toLowerCase(Locale.ROOT);
    }

    private static RoomSnapshot toSnapshot(RoomState room) {
        List<RoomPlayerSnapshot> players = room.players.stream()
                .map(player -> new RoomPlayerSnapshot(player.playerId(), player.displayName()))
                .toList();
        return new RoomSnapshot(room.code, players);
    }

    private static final class RoomState {
        private final String code;
        private final List<PlayerState> players = new ArrayList<>();
        private final Map<String, String> playerTokens = new ConcurrentHashMap<>();
        private long lastTouchedAtMillis;

        private RoomState(String code) {
            this.code = code;
            this.lastTouchedAtMillis = System.currentTimeMillis();
        }

        private String addPlayer(String displayName) {
            String playerId = "p" + (players.size() + 1);
            players.add(new PlayerState(playerId, displayName));
            return playerId;
        }
    }

    private record PlayerState(String playerId, String displayName) {
    }
}
