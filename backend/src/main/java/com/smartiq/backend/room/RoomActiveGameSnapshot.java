package com.smartiq.backend.room;

public record RoomActiveGameSnapshot(
        String gameId,
        String topic,
        String status,
        Integer roundNumber
) {
}
