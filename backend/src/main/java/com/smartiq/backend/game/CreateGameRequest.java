package com.smartiq.backend.game;

import java.util.List;

public record CreateGameRequest(
        List<String> players,
        String language,
        String topic,
        Integer winCondition,
        String roomCode
) {
    public CreateGameRequest(List<String> players, String language, String topic, Integer winCondition) {
        this(players, language, topic, winCondition, null);
    }
}
