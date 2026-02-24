package com.smartiq.backend.game;

public record GameActionRequest(
        String type,
        Integer tileIndex,
        Integer rank,
        String actorPlayerId,
        String actionToken,
        String actionRequestId
) {
}
