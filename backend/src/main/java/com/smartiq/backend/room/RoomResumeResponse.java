package com.smartiq.backend.room;

public record RoomResumeResponse(
        String roomCode,
        String playerId,
        String authToken,
        RoomSnapshot roomState
) {
}
