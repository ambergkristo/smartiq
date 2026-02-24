package com.smartiq.backend.room;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class RoomService {

    private static final int MAX_PLAYERS = 8;
    private static final int ROOM_CODE_LENGTH = 6;
    private static final String ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String DEFAULT_HOST_NAME = "Host";

    private final SecureRandom random = new SecureRandom();
    private final ConcurrentMap<String, RoomState> rooms = new ConcurrentHashMap<>();

    public synchronized RoomParticipantResponse createRoom(CreateRoomRequest request) {
        String displayName = normalizeDisplayName(request == null ? null : request.displayName(), DEFAULT_HOST_NAME);
        String roomCode = allocateUniqueRoomCode();

        RoomState room = new RoomState(roomCode);
        String playerId = room.addPlayer(displayName);
        String authToken = issueToken();
        room.playerTokens.put(playerId, authToken);
        rooms.put(roomCode, room);

        return new RoomParticipantResponse(roomCode, playerId, authToken);
    }

    public synchronized RoomParticipantResponse joinRoom(String roomCode, JoinRoomRequest request) {
        RoomState room = requireRoom(roomCode);
        if (room.players.size() >= MAX_PLAYERS) {
            throw new IllegalArgumentException("room is full");
        }

        String fallbackName = "Player " + (room.players.size() + 1);
        String displayName = normalizeDisplayName(request == null ? null : request.displayName(), fallbackName);
        String playerId = room.addPlayer(displayName);
        String authToken = issueToken();
        room.playerTokens.put(playerId, authToken);

        return new RoomParticipantResponse(room.code, playerId, authToken);
    }

    public synchronized RoomSnapshot getRoomSnapshot(String roomCode) {
        RoomState room = requireRoom(roomCode);
        return toSnapshot(room);
    }

    public synchronized RoomResumeResponse rejoinRoom(String roomCode, RejoinRoomRequest request) {
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
        if (!expectedToken.equals(authToken)) {
            throw new IllegalArgumentException("invalid room token");
        }

        return new RoomResumeResponse(room.code, playerId, authToken, toSnapshot(room));
    }

    private RoomState requireRoom(String roomCode) {
        String normalized = normalizeRoomCode(roomCode);
        RoomState room = rooms.get(normalized);
        if (room == null) {
            throw new NoSuchElementException("room not found: " + normalized);
        }
        return room;
    }

    private String allocateUniqueRoomCode() {
        for (int attempt = 0; attempt < 50; attempt += 1) {
            String candidate = randomRoomCode();
            if (!rooms.containsKey(candidate)) {
                return candidate;
            }
        }

        String fallback = UUID.randomUUID().toString().replace("-", "")
                .substring(0, ROOM_CODE_LENGTH)
                .toUpperCase(Locale.ROOT);
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
        return roomCode.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeDisplayName(String displayName, String fallbackName) {
        if (displayName == null || displayName.isBlank()) {
            return fallbackName;
        }
        return displayName.trim();
    }

    private static String normalizePlayerId(String playerId) {
        if (playerId == null || playerId.isBlank()) {
            throw new IllegalArgumentException("playerId is required");
        }
        return playerId.trim();
    }

    private static String normalizeAuthToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new IllegalArgumentException("authToken is required");
        }
        return authToken.trim();
    }

    private static String issueToken() {
        return "rt_" + UUID.randomUUID().toString().replace("-", "");
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

        private RoomState(String code) {
            this.code = code;
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
