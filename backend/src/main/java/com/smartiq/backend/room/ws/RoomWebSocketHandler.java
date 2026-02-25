package com.smartiq.backend.room.ws;

import com.smartiq.backend.room.RejoinRoomRequest;
import com.smartiq.backend.room.RoomResumeResponse;
import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.RoomSnapshot;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.NoSuchElementException;

@Component
public class RoomWebSocketHandler extends TextWebSocketHandler {

    private static final String ROOMS_PATH_PREFIX = "/ws/rooms/";
    private static final int ROOM_CODE_LENGTH = 6;
    private static final String ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String METRIC_WS_CONNECT = "smartiq.room.ws.connect.total";
    private static final String METRIC_WS_MESSAGE_REJECTED = "smartiq.room.ws.message.rejected.total";
    private static final String GENERIC_HANDSHAKE_REJECT_REASON = "invalid websocket request";
    private static final int MAX_QUERY_LENGTH = 1024;
    private static final int MAX_QUERY_VALUE_LENGTH = 256;

    private final RoomService roomService;
    private final RoomWsGateway roomWsGateway;
    private final MeterRegistry meterRegistry;

    public RoomWebSocketHandler(RoomService roomService,
                                RoomWsGateway roomWsGateway,
                                MeterRegistry meterRegistry) {
        this.roomService = roomService;
        this.roomWsGateway = roomWsGateway;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            String roomCode = resolveRoomCode(session);
            String playerId = resolveRequiredQueryParam(session, "playerId");
            String authToken = resolveRequiredQueryParam(session, "authToken");
            RoomResumeResponse resume = roomService.rejoinRoom(roomCode, new RejoinRoomRequest(playerId, authToken));
            RoomSnapshot snapshot = resume.roomState();
            roomWsGateway.register(roomCode, playerId, session);
            roomWsGateway.sendRoomStateToSession(session, snapshot);
            incrementConnectCounter("success", "none");
        } catch (IllegalArgumentException | NoSuchElementException ex) {
            incrementConnectCounter("failure", classifyConnectFailure(ex));
            closeQuietly(session, CloseStatus.NOT_ACCEPTABLE.withReason(GENERIC_HANDSHAKE_REJECT_REASON));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        meterRegistry.counter(METRIC_WS_MESSAGE_REJECTED, "reason", "unsupported_client_message").increment();
        roomWsGateway.unregister(session);
        closeQuietly(session, CloseStatus.POLICY_VIOLATION.withReason("client messages are not supported"));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        meterRegistry.counter(METRIC_WS_MESSAGE_REJECTED, "reason", "transport_error").increment();
        roomWsGateway.unregister(session);
        closeQuietly(session, CloseStatus.SERVER_ERROR.withReason("transport error"));
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

        String normalized = rawCode.trim().toUpperCase(Locale.ROOT);
        if (!isValidRoomCode(normalized)) {
            throw new IllegalArgumentException("room code format is invalid");
        }
        return normalized;
    }

    private static String resolveRequiredQueryParam(WebSocketSession session, String key) {
        URI uri = session.getUri();
        if (uri == null || uri.getRawQuery() == null || uri.getRawQuery().isBlank()) {
            throw new IllegalArgumentException(key + " is required");
        }
        String rawQuery = uri.getRawQuery();
        if (rawQuery.length() > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException("query is too long");
        }

        String[] pairs = rawQuery.split("&");
        for (String pair : pairs) {
            if (pair == null || pair.isBlank()) {
                continue;
            }
            String[] parts = pair.split("=", 2);
            String rawKey = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
            if (!key.equals(rawKey)) {
                continue;
            }
            String rawValue = parts.length > 1 ? parts[1] : "";
            String value = URLDecoder.decode(rawValue, StandardCharsets.UTF_8).trim();
            if (value.length() > MAX_QUERY_VALUE_LENGTH) {
                throw new IllegalArgumentException(key + " is too long");
            }
            if (value.isEmpty()) {
                break;
            }
            return value;
        }

        throw new IllegalArgumentException(key + " is required");
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

    private void incrementConnectCounter(String result, String reason) {
        meterRegistry.counter(METRIC_WS_CONNECT, "result", result, "reason", reason).increment();
    }

    private static String classifyConnectFailure(RuntimeException ex) {
        String message = ex.getMessage() == null ? "" : ex.getMessage().trim().toLowerCase(Locale.ROOT);
        if (ex instanceof NoSuchElementException) {
            if (message.contains("room not found")) {
                return "room_not_found";
            }
            if (message.contains("player not found")) {
                return "player_not_found";
            }
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
        if (message.contains("invalid room token")) {
            return "invalid_room_token";
        }
        return "invalid_request";
    }
}
