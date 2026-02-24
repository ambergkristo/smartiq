package com.smartiq.backend.room.ws;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.room.RoomSnapshot;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class RoomWsGateway {

    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> sessionRoomCodes = new ConcurrentHashMap<>();

    public RoomWsGateway(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(String roomCode, WebSocketSession session) {
        String normalized = normalizeRoomCode(roomCode);
        String previousRoom = sessionRoomCodes.put(session.getId(), normalized);
        if (previousRoom != null && !previousRoom.equals(normalized)) {
            removeFromRoom(previousRoom, session);
        }
        roomSessions.computeIfAbsent(normalized, key -> ConcurrentHashMap.newKeySet()).add(session);
    }

    public void unregister(WebSocketSession session) {
        String roomCode = sessionRoomCodes.remove(session.getId());
        if (roomCode != null) {
            removeFromRoom(roomCode, session);
        }
    }

    public void sendRoomState(String roomCode, RoomSnapshot snapshot) {
        broadcast(roomCode, "ROOM_STATE", snapshot);
    }

    public void sendRoomStateToSession(WebSocketSession session, RoomSnapshot snapshot) {
        send(session, "ROOM_STATE", snapshot);
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
        for (WebSocketSession session : sessions) {
            send(session, type, payload);
        }
    }

    private void send(WebSocketSession session, String type, Object payload) {
        if (!session.isOpen()) {
            unregister(session);
            return;
        }

        String serialized = serialize(new EventEnvelope(type, payload));
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(serialized));
            }
        } catch (IOException | IllegalStateException ex) {
            unregister(session);
        }
    }

    private static String normalizeRoomCode(String roomCode) {
        if (roomCode == null || roomCode.isBlank()) {
            throw new IllegalArgumentException("room code is required");
        }
        return roomCode.trim().toUpperCase(Locale.ROOT);
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

    private record EventEnvelope(String type, Object payload) {
    }

    private record PlayerJoinedPayload(String playerId, RoomSnapshot roomState) {
    }
}
