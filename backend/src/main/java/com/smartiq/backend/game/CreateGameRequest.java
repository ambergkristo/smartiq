package com.smartiq.backend.game;

import java.util.List;

public record CreateGameRequest(
        List<String> players,
        String language,
        String topic,
        Integer winCondition,
        String roomCode,
        String roomPlayerId,
        String roomAuthToken
) {
    public CreateGameRequest(List<String> players, String language, String topic, Integer winCondition) {
        this(players, language, topic, winCondition, null, null, null);
    }

    public boolean hasRoomLaunchContext() {
        return roomCode != null && !roomCode.isBlank();
    }

    public CreateGameRequest withoutRoomLaunchContext(List<String> resolvedPlayers) {
        return new CreateGameRequest(
                resolvedPlayers,
                language,
                topic,
                winCondition,
                null,
                null,
                null
        );
    }
}
