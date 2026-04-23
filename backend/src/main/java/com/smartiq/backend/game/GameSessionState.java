package com.smartiq.backend.game;

import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.game.contract.PlayerRoundStatus;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class GameSessionState {
    final String gameId;
    final UUID tenantId;
    final String hostUserEmail;
    final String language;
    final String topic;
    final int winCondition;
    final List<PlayerState> players;
    final Map<String, Integer> totalScores;
    final Map<String, Integer> roundScores;
    final Map<String, PlayerRoundStatus> statuses;
    final Map<String, String> actionTokens;
    final LinkedHashSet<String> processedActionRequestIds;
    int roundNumber;
    int starterPlayerIndex;
    int activePlayerIndex;
    String phase;
    String lastAction;
    CardDeckResponse card;
    List<PegState> pegs;
    final long gameStartedAtMillis;
    long roundStartedAtMillis;
    long lastTouchedAtMillis;

    GameSessionState(String gameId,
                     UUID tenantId,
                     String hostUserEmail,
                     String language,
                     String topic,
                     int winCondition,
                     List<PlayerState> players,
                     Map<String, Integer> totalScores,
                     Map<String, Integer> roundScores,
                     Map<String, PlayerRoundStatus> statuses,
                     Map<String, String> actionTokens,
                     CardDeckResponse card,
                     List<PegState> pegs,
                     long nowMillis) {
        this(
                gameId,
                tenantId,
                hostUserEmail,
                language,
                topic,
                winCondition,
                players,
                totalScores,
                roundScores,
                statuses,
                actionTokens,
                new LinkedHashSet<>(),
                1,
                0,
                0,
                "QUESTION_ACTIVE",
                "Game started",
                card,
                pegs,
                nowMillis,
                nowMillis,
                nowMillis
        );
    }

    GameSessionState(String gameId,
                     UUID tenantId,
                     String hostUserEmail,
                     String language,
                     String topic,
                     int winCondition,
                     List<PlayerState> players,
                     Map<String, Integer> totalScores,
                     Map<String, Integer> roundScores,
                     Map<String, PlayerRoundStatus> statuses,
                     Map<String, String> actionTokens,
                     LinkedHashSet<String> processedActionRequestIds,
                     int roundNumber,
                     int starterPlayerIndex,
                     int activePlayerIndex,
                     String phase,
                     String lastAction,
                     CardDeckResponse card,
                     List<PegState> pegs,
                     long gameStartedAtMillis,
                     long roundStartedAtMillis,
                     long lastTouchedAtMillis) {
        this.gameId = gameId;
        this.tenantId = tenantId;
        this.hostUserEmail = hostUserEmail;
        this.language = language;
        this.topic = topic;
        this.winCondition = winCondition;
        this.players = players;
        this.totalScores = totalScores;
        this.roundScores = roundScores;
        this.statuses = statuses;
        this.actionTokens = actionTokens;
        this.processedActionRequestIds = processedActionRequestIds;
        this.roundNumber = roundNumber;
        this.starterPlayerIndex = starterPlayerIndex;
        this.activePlayerIndex = activePlayerIndex;
        this.phase = phase;
        this.lastAction = lastAction;
        this.card = card;
        this.pegs = pegs;
        this.gameStartedAtMillis = gameStartedAtMillis;
        this.roundStartedAtMillis = roundStartedAtMillis;
        this.lastTouchedAtMillis = lastTouchedAtMillis;
    }

    String currentPlayerId() {
        return players.get(activePlayerIndex).playerId();
    }

    String currentPlayerName() {
        return players.get(activePlayerIndex).displayName();
    }
}

record PlayerState(String playerId, String displayName) {
}

record PegState(int index, String state) {
}
