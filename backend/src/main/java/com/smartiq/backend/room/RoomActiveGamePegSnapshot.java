package com.smartiq.backend.room;

public record RoomActiveGamePegSnapshot(
        int index,
        String state,
        String value
) {
}
