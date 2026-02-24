package com.smartiq.backend.room;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoomServiceTest {

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new RoomService();
    }

    @Test
    void createRoomAllocatesHostPlayerAndToken() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThat(created.roomCode()).matches("^[A-Z0-9]{6}$");
        assertThat(created.playerId()).isEqualTo("p1");
        assertThat(created.authToken()).startsWith("rt_");
    }

    @Test
    void joinRoomAllocatesNextPlayerId() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        RoomParticipantResponse joined = roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        assertThat(joined.roomCode()).isEqualTo(created.roomCode());
        assertThat(joined.playerId()).isEqualTo("p2");
        assertThat(joined.authToken()).startsWith("rt_");
        assertThat(joined.authToken()).isNotEqualTo(created.authToken());
    }

    @Test
    void roomSnapshotContainsAllPlayersInJoinOrder() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        RoomSnapshot snapshot = roomService.getRoomSnapshot(created.roomCode());

        assertThat(snapshot.roomCode()).isEqualTo(created.roomCode());
        assertThat(snapshot.players()).hasSize(2);
        assertThat(snapshot.players().get(0).playerId()).isEqualTo("p1");
        assertThat(snapshot.players().get(0).displayName()).isEqualTo("Alice");
        assertThat(snapshot.players().get(1).playerId()).isEqualTo("p2");
        assertThat(snapshot.players().get(1).displayName()).isEqualTo("Bob");
    }

    @Test
    void joinUnknownRoomThrowsNotFound() {
        assertThatThrownBy(() -> roomService.joinRoom("MISSING", new JoinRoomRequest("Bob")))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("room not found: MISSING");
    }

    @Test
    void joinRoomRejectsWhenRoomIsFull() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        for (int playerNumber = 2; playerNumber <= 8; playerNumber += 1) {
            roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Player " + playerNumber));
        }

        assertThatThrownBy(() -> roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Overflow")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("room is full");
    }
}
