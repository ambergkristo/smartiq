package com.smartiq.backend.room;

import java.util.List;

public record LaunchRoomGameRequest(
        String hostPlayerId,
        String hostAuthToken,
        List<String> players
) {
}
