package com.smartiq.backend.game.contract;

import java.util.List;

public record BoardStateSnapshot(
        String question,
        String category,
        String topic,
        String language,
        List<PegSnapshot> pegs
) {
    public BoardStateSnapshot(String question,
                              String category,
                              String topic,
                              List<PegSnapshot> pegs) {
        this(question, category, topic, null, pegs);
    }
}
