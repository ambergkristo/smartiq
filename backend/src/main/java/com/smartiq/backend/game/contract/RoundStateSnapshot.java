package com.smartiq.backend.game.contract;

public record RoundStateSnapshot(
        int roundNumber,
        String phase,
        String starterPlayerId,
        String currentPlayerId,
        String lastAction
) {
}
