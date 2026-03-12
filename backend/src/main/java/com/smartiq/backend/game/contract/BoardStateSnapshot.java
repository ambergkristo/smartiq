package com.smartiq.backend.game.contract;

import java.util.List;

public record BoardStateSnapshot(
        String question,
        String category,
        String topic,
        List<PegSnapshot> pegs,
        List<Integer> correctAnswerIndexes
) {
}
