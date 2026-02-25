package com.smartiq.backend.room.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.room.RoomPlayerSnapshot;
import com.smartiq.backend.room.RoomSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class RoomWsGatewayTest {

    @Mock
    private WebSocketSession sessionOne;

    @Mock
    private WebSocketSession sessionTwo;

    private RoomWsGateway roomWsGateway;

    @BeforeEach
    void setUp() {
        roomWsGateway = new RoomWsGateway(new ObjectMapper());
    }

    @Test
    void sendRoomStateBroadcastsToRegisteredSessions() throws Exception {
        when(sessionOne.getId()).thenReturn("s1");
        when(sessionOne.isOpen()).thenReturn(true);
        when(sessionTwo.getId()).thenReturn("s2");
        when(sessionTwo.isOpen()).thenReturn(true);
        roomWsGateway.register("ABC234", "p1", sessionOne);
        roomWsGateway.register("ABC234", "p2", sessionTwo);

        RoomSnapshot snapshot = snapshot("ABC234");
        roomWsGateway.sendRoomState("ABC234", snapshot);

        ArgumentCaptor<TextMessage> firstMessage = ArgumentCaptor.forClass(TextMessage.class);
        ArgumentCaptor<TextMessage> secondMessage = ArgumentCaptor.forClass(TextMessage.class);
        verify(sessionOne).sendMessage(firstMessage.capture());
        verify(sessionTwo).sendMessage(secondMessage.capture());
        assertThat(firstMessage.getValue().getPayload()).contains("\"type\":\"ROOM_STATE\"");
        assertThat(firstMessage.getValue().getPayload()).contains("\"roomCode\":\"ABC234\"");
        assertThat(secondMessage.getValue().getPayload()).contains("\"type\":\"ROOM_STATE\"");
    }

    @Test
    void sendPlayerJoinedUsesExpectedEventTypeAndPayload() throws Exception {
        when(sessionOne.getId()).thenReturn("s1");
        when(sessionOne.isOpen()).thenReturn(true);
        roomWsGateway.register("ABC234", "p1", sessionOne);

        roomWsGateway.sendPlayerJoined("ABC234", "p2", snapshot("ABC234"));

        ArgumentCaptor<TextMessage> message = ArgumentCaptor.forClass(TextMessage.class);
        verify(sessionOne).sendMessage(message.capture());
        assertThat(message.getValue().getPayload()).contains("\"type\":\"PLAYER_JOINED\"");
        assertThat(message.getValue().getPayload()).contains("\"playerId\":\"p2\"");
    }

    @Test
    void unregisterStopsFutureBroadcasts() throws Exception {
        when(sessionOne.getId()).thenReturn("s1");
        when(sessionTwo.getId()).thenReturn("s2");
        when(sessionTwo.isOpen()).thenReturn(true);
        roomWsGateway.register("ABC234", "p1", sessionOne);
        roomWsGateway.register("ABC234", "p2", sessionTwo);
        roomWsGateway.unregister(sessionOne);

        roomWsGateway.sendRoomState("ABC234", snapshot("ABC234"));

        verify(sessionOne, never()).sendMessage(any());
        verify(sessionTwo).sendMessage(any(TextMessage.class));
    }

    @Test
    void newerConnectionForSamePlayerReplacesOldSession() throws Exception {
        when(sessionOne.getId()).thenReturn("s1");
        when(sessionOne.isOpen()).thenReturn(true);
        when(sessionTwo.getId()).thenReturn("s2");
        when(sessionTwo.isOpen()).thenReturn(true);

        roomWsGateway.register("ABC234", "p1", sessionOne);
        roomWsGateway.register("ABC234", "p1", sessionTwo);
        roomWsGateway.sendRoomState("ABC234", snapshot("ABC234"));

        verify(sessionOne, never()).sendMessage(any());
        verify(sessionTwo).sendMessage(any(TextMessage.class));
        verify(sessionOne).close();
    }

    @Test
    void sendFailureUnregistersAndClosesSession() throws Exception {
        when(sessionOne.getId()).thenReturn("s1");
        when(sessionOne.isOpen()).thenReturn(true);
        doThrow(new IOException("write failed")).when(sessionOne).sendMessage(any(TextMessage.class));
        roomWsGateway.register("ABC234", "p1", sessionOne);

        roomWsGateway.sendRoomState("ABC234", snapshot("ABC234"));
        roomWsGateway.sendRoomState("ABC234", snapshot("ABC234"));

        verify(sessionOne, times(1)).sendMessage(any(TextMessage.class));
        verify(sessionOne).close();
    }

    @Test
    void registerRejectsInvalidRoomCodeFormat() {
        assertThatThrownBy(() -> roomWsGateway.register("ABC123", "p1", sessionOne))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("room code format is invalid");
    }

    @Test
    void registerRejectsInvalidPlayerIdFormat() {
        assertThatThrownBy(() -> roomWsGateway.register("ABC234", "player-1", sessionOne))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("playerId format is invalid");
    }

    @Test
    void registerRejectsPlayerIdOutOfAllowedRange() {
        assertThatThrownBy(() -> roomWsGateway.register("ABC234", "p9", sessionOne))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("playerId format is invalid");
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
