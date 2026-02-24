package com.smartiq.backend.game.contract;

public record PegSnapshot(
        int index,
        String state,
        String value
) {
}
