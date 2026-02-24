package com.smartiq.backend.room;

public record RoomParticipantResponse(
        String roomCode,
        String playerId,
        String authToken
) {
}
