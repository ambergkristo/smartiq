package com.smartiq.backend.room;

import java.util.List;

public record RoomSnapshot(
        String roomCode,
        List<RoomPlayerSnapshot> players
) {
}
