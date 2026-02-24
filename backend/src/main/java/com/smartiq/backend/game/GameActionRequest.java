package com.smartiq.backend.game;

public record GameActionRequest(
        String type,
        Integer tileIndex,
        Integer rank
) {
}
