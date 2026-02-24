package com.smartiq.backend.room.ws;

import com.smartiq.backend.room.RoomPlayerSnapshot;
import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.RoomSnapshot;
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

    private RoomWebSocketHandler roomWebSocketHandler;

    @BeforeEach
    void setUp() {
        roomWebSocketHandler = new RoomWebSocketHandler(roomService, roomWsGateway);
    }

    @Test
    void connectionRegistersSessionAndPushesRoomState() throws Exception {
        RoomSnapshot snapshot = snapshot("ABC123");
        when(webSocketSession.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/abc123"));
        when(roomService.getRoomSnapshot(eq("ABC123"))).thenReturn(snapshot);

        roomWebSocketHandler.afterConnectionEstablished(webSocketSession);

        verify(roomWsGateway).register("ABC123", webSocketSession);
        verify(roomWsGateway).sendRoomStateToSession(webSocketSession, snapshot);
        verify(webSocketSession, never()).close(any(CloseStatus.class));
    }

    @Test
    void unknownRoomClosesConnectionWithNotAcceptable() throws Exception {
        when(webSocketSession.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/missing"));
        when(webSocketSession.isOpen()).thenReturn(true);
        when(roomService.getRoomSnapshot(eq("MISSING")))
                .thenThrow(new NoSuchElementException("room not found: MISSING"));

        roomWebSocketHandler.afterConnectionEstablished(webSocketSession);

        ArgumentCaptor<CloseStatus> closeStatus = ArgumentCaptor.forClass(CloseStatus.class);
        verify(webSocketSession).close(closeStatus.capture());
        assertThat(closeStatus.getValue().getCode()).isEqualTo(CloseStatus.NOT_ACCEPTABLE.getCode());
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
}
