package com.smartiq.backend.room.ws;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.room.RoomSnapshot;
import com.smartiq.backend.shared.RuntimeLimits;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Pattern;

@Service
public class RoomWsGateway {

    private static final int ROOM_CODE_LENGTH = 6;
    private static final String ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int MAX_PLAYERS = RuntimeLimits.MAX_PLAYERS_PER_ROOM;
    private static final int MAX_PLAYER_ID_LENGTH = 64;
    private static final Pattern PLAYER_ID_PATTERN = Pattern.compile("^p[1-9][0-9]*$");

    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> sessionRoomCodes = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> sessionPlayerKeys = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, WebSocketSession> playerSessions = new ConcurrentHashMap<>();

    public RoomWsGateway(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(String roomCode, String playerId, WebSocketSession session) {
        String normalized = normalizeRoomCode(roomCode);
        String normalizedPlayer = normalizePlayerId(playerId);

        unregister(session);

        String playerKey = playerKey(normalized, normalizedPlayer);
        WebSocketSession previousPlayerSession = playerSessions.put(playerKey, session);
        if (previousPlayerSession != null && !previousPlayerSession.getId().equals(session.getId())) {
            unregister(previousPlayerSession);
            closeQuietly(previousPlayerSession);
        }
        sessionRoomCodes.put(session.getId(), normalized);
        sessionPlayerKeys.put(session.getId(), playerKey);
        roomSessions.computeIfAbsent(normalized, key -> ConcurrentHashMap.newKeySet()).add(session);
    }

    public void unregister(WebSocketSession session) {
        String sessionId = session.getId();
        String roomCode = sessionRoomCodes.remove(sessionId);
        String playerKey = sessionPlayerKeys.remove(sessionId);
        if (playerKey != null) {
            playerSessions.remove(playerKey, session);
        }
        if (roomCode != null) {
            removeFromRoom(roomCode, session);
        }
    }

    public void sendRoomState(String roomCode, RoomSnapshot snapshot) {
        broadcast(roomCode, "ROOM_STATE", snapshot);
    }

    public void sendRoomStateToSession(WebSocketSession session, RoomSnapshot snapshot) {
        send(session, serialize(new EventEnvelope("ROOM_STATE", snapshot)));
    }

    public void sendPlayerJoined(String roomCode, String playerId, RoomSnapshot snapshot) {
        broadcast(roomCode, "PLAYER_JOINED", new PlayerJoinedPayload(playerId, snapshot));
    }

    public void sendTurnChanged(String roomCode, RoomSnapshot snapshot) {
        broadcast(roomCode, "TURN_CHANGED", snapshot);
    }

    public void sendRoundEnded(String roomCode, RoomSnapshot snapshot) {
        broadcast(roomCode, "ROUND_ENDED", snapshot);
    }

    public void sendGameEnded(String roomCode, RoomSnapshot snapshot) {
        broadcast(roomCode, "GAME_ENDED", snapshot);
    }

    private void broadcast(String roomCode, String type, Object payload) {
        String normalized = normalizeRoomCode(roomCode);
        Set<WebSocketSession> sessions = roomSessions.get(normalized);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String serialized = serialize(new EventEnvelope(type, payload));
        for (WebSocketSession session : sessions) {
            send(session, serialized);
        }
    }

    private void send(WebSocketSession session, String serialized) {
        if (!session.isOpen()) {
            unregister(session);
            return;
        }
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(serialized));
            }
        } catch (IOException | IllegalStateException ex) {
            unregister(session);
            closeQuietly(session);
        }
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

    private static String playerKey(String roomCode, String playerId) {
        return roomCode + "|" + playerId;
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

    private void removeFromRoom(String roomCode, WebSocketSession session) {
        Set<WebSocketSession> sessions = roomSessions.get(roomCode);
        if (sessions == null) {
            return;
        }
        sessions.remove(session);
        if (sessions.isEmpty()) {
            roomSessions.remove(roomCode, sessions);
        }
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("failed to serialize websocket event", ex);
        }
    }

    private static void closeQuietly(WebSocketSession session) {
        try {
            if (session.isOpen()) {
                session.close();
            }
        } catch (IOException ignored) {
            // best-effort close
        }
    }

    private record EventEnvelope(String type, Object payload) {
    }

    private record PlayerJoinedPayload(String playerId, RoomSnapshot roomState) {
    }
}
