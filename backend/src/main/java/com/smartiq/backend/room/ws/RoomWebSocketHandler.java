package com.smartiq.backend.room.ws;

import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.RoomSnapshot;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Locale;
import java.util.NoSuchElementException;

@Component
public class RoomWebSocketHandler extends TextWebSocketHandler {

    private static final String ROOMS_PATH_PREFIX = "/ws/rooms/";

    private final RoomService roomService;
    private final RoomWsGateway roomWsGateway;

    public RoomWebSocketHandler(RoomService roomService, RoomWsGateway roomWsGateway) {
        this.roomService = roomService;
        this.roomWsGateway = roomWsGateway;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            String roomCode = resolveRoomCode(session);
            RoomSnapshot snapshot = roomService.getRoomSnapshot(roomCode);
            roomWsGateway.register(roomCode, session);
            roomWsGateway.sendRoomStateToSession(session, snapshot);
        } catch (IllegalArgumentException | NoSuchElementException ex) {
            closeQuietly(session, CloseStatus.NOT_ACCEPTABLE.withReason(trimReason(ex.getMessage())));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Room gateway is currently server-push only.
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        roomWsGateway.unregister(session);
    }

    private static String resolveRoomCode(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null || uri.getPath() == null) {
            throw new IllegalArgumentException("room code is required");
        }

        String path = uri.getPath();
        if (!path.startsWith(ROOMS_PATH_PREFIX) || path.length() <= ROOMS_PATH_PREFIX.length()) {
            throw new IllegalArgumentException("room code is required");
        }

        String suffix = path.substring(ROOMS_PATH_PREFIX.length());
        int slashIndex = suffix.indexOf('/');
        String rawCode = slashIndex >= 0 ? suffix.substring(0, slashIndex) : suffix;
        if (rawCode.isBlank()) {
            throw new IllegalArgumentException("room code is required");
        }

        return rawCode.trim().toUpperCase(Locale.ROOT);
    }

    private static String trimReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "invalid websocket request";
        }
        String trimmed = reason.trim();
        if (trimmed.length() <= 120) {
            return trimmed;
        }
        return trimmed.substring(0, 120);
    }

    private static void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            if (session.isOpen()) {
                session.close(status);
            }
        } catch (IOException ignored) {
            // Best-effort close.
        }
    }
}
