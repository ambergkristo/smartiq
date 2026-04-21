package com.smartiq.backend.room;

import com.smartiq.backend.game.GameSessionCreateResponse;

public record RoomLaunchResult(
        GameSessionCreateResponse gameSession,
        RoomSnapshot roomState
) {
}
