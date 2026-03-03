package com.smartiq.backend.game.contract;

import java.util.List;
import java.util.Map;

public record GameSessionSnapshot(
        String apiVersion,
        String gameId,
        int winCondition,
        int activePlayerIndex,
        List<PlayerSnapshot> players,
        RoundStateSnapshot roundState,
        BoardStateSnapshot boardState,
        Map<String, Integer> totalScores,
        Map<String, Integer> roundScores,
        Map<String, PlayerRoundStatus> statuses
) {
    public static final String CURRENT_API_VERSION = "1";
}
