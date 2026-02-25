package com.smartiq.backend.room.ws;

import com.smartiq.backend.room.RejoinRoomRequest;
import com.smartiq.backend.room.RoomPlayerSnapshot;
import com.smartiq.backend.room.RoomResumeResponse;
import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.RoomSnapshot;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.util.List;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomWebSocketHandlerTest {

    @Mock
    private RoomService roomService;

    @Mock
    private RoomWsGateway roomWsGateway;

    @Mock
    private WebSocketSession webSocketSession;

    private SimpleMeterRegistry meterRegistry;
    private RoomWebSocketHandler roomWebSocketHandler;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        roomWebSocketHandler = new RoomWebSocketHandler(roomService, roomWsGateway, meterRegistry);
    }

    @Test
    void connectionRegistersSessionAndPushesRoomState() throws Exception {
        RoomSnapshot snapshot = snapshot("ABC123");
        when(webSocketSession.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/abc123?playerId=p1&authToken=rt_host"));
        when(roomService.rejoinRoom(eq("ABC123"), eq(new RejoinRoomRequest("p1", "rt_host"))))
                .thenReturn(new RoomResumeResponse("ABC123", "p1", "rt_host", snapshot));

        roomWebSocketHandler.afterConnectionEstablished(webSocketSession);

        verify(roomWsGateway).register("ABC123", "p1", webSocketSession);
        verify(roomWsGateway).sendRoomStateToSession(webSocketSession, snapshot);
        verify(webSocketSession, never()).close(any(CloseStatus.class));
        assertThat(counterValue("success", "none")).isEqualTo(1.0);
    }

    @Test
    void unknownRoomClosesConnectionWithNotAcceptable() throws Exception {
        when(webSocketSession.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/ZZZZZZ?playerId=p1&authToken=rt_host"));
        when(webSocketSession.isOpen()).thenReturn(true);
        when(roomService.rejoinRoom(eq("ZZZZZZ"), eq(new RejoinRoomRequest("p1", "rt_host"))))
                .thenThrow(new NoSuchElementException("room not found: ZZZZZZ"));

        roomWebSocketHandler.afterConnectionEstablished(webSocketSession);

        ArgumentCaptor<CloseStatus> closeStatus = ArgumentCaptor.forClass(CloseStatus.class);
        verify(webSocketSession).close(closeStatus.capture());
        assertThat(closeStatus.getValue().getCode()).isEqualTo(CloseStatus.NOT_ACCEPTABLE.getCode());
        assertThat(counterValue("failure", "room_not_found")).isEqualTo(1.0);
    }

    @Test
    void invalidRoomCodeFormatClosesConnectionWithNotAcceptable() throws Exception {
        when(webSocketSession.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/missing?playerId=p1&authToken=rt_host"));
        when(webSocketSession.isOpen()).thenReturn(true);
        when(roomService.rejoinRoom(eq("MISSING"), eq(new RejoinRoomRequest("p1", "rt_host"))))
                .thenThrow(new IllegalArgumentException("room code format is invalid"));

        roomWebSocketHandler.afterConnectionEstablished(webSocketSession);

        ArgumentCaptor<CloseStatus> closeStatus = ArgumentCaptor.forClass(CloseStatus.class);
        verify(webSocketSession).close(closeStatus.capture());
        assertThat(closeStatus.getValue().getCode()).isEqualTo(CloseStatus.NOT_ACCEPTABLE.getCode());
        assertThat(counterValue("failure", "invalid_room_code")).isEqualTo(1.0);
    }

    @Test
    void missingTokenClosesConnectionWithNotAcceptable() throws Exception {
        when(webSocketSession.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/abc123?playerId=p1"));
        when(webSocketSession.isOpen()).thenReturn(true);

        roomWebSocketHandler.afterConnectionEstablished(webSocketSession);

        ArgumentCaptor<CloseStatus> closeStatus = ArgumentCaptor.forClass(CloseStatus.class);
        verify(webSocketSession).close(closeStatus.capture());
        assertThat(closeStatus.getValue().getCode()).isEqualTo(CloseStatus.NOT_ACCEPTABLE.getCode());
        verify(roomWsGateway, never()).register(any(), any(), any());
        assertThat(counterValue("failure", "missing_auth_token")).isEqualTo(1.0);
    }

    @Test
    void connectionClosedUnregistersSession() throws Exception {
        roomWebSocketHandler.afterConnectionClosed(webSocketSession, CloseStatus.NORMAL);
        verify(roomWsGateway).unregister(webSocketSession);
    }

    private static RoomSnapshot snapshot(String roomCode) {
        return new RoomSnapshot(
                roomCode,
                List.of(
                        new RoomPlayerSnapshot("p1", "Alice"),
                        new RoomPlayerSnapshot("p2", "Bob")
                )
        );
    }

    private double counterValue(String result, String reason) {
        var counter = meterRegistry.find("smartiq.room.ws.connect.total")
                .tag("result", result)
                .tag("reason", reason)
                .counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }
}
