package com.smartiq.backend.room;

public record RemoveRoomPlayerRequest(
        String hostPlayerId,
        String hostAuthToken,
        String targetPlayerId
) {
}
