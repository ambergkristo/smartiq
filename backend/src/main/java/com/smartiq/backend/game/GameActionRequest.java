package com.smartiq.backend.game;

public record GameActionRequest(
        String type,
        Integer tileIndex,
        String actorPlayerId,
        String actionToken,
        String actionRequestId
) {
}
