package com.smartiq.backend.room;

public record RejoinRoomRequest(
        String playerId,
        String authToken
) {
}
