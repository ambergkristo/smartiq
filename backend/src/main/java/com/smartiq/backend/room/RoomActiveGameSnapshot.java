package com.smartiq.backend.room;

import com.smartiq.backend.game.contract.PlayerRoundStatus;

import java.util.List;
import java.util.Map;

public record RoomActiveGameSnapshot(
        String gameId,
        String roomCode,
        int winCondition,
        int roundNumber,
        String phase,
        String topic,
        String question,
        String lastAction,
        String starterPlayerId,
        String currentPlayerId,
        String currentPlayerDisplayName,
        Map<String, String> playerDisplayNames,
        List<RoomActiveGamePegSnapshot> pegs,
        Map<String, Integer> totalScores,
        Map<String, Integer> roundScores,
        Map<String, PlayerRoundStatus> statuses
) {
}
