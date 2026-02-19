package com.smartiq.backend.card;

import java.time.Instant;
import java.util.List;

public record CardNextResponseV2(
        String id,
        String cardId,
        String topic,
        String subtopic,
        String language,
        String question,
        List<CardOptionResponseV2> options,
        Integer correctIndex,
        List<Integer> correctIndexes,
        boolean multiCorrect,
        int difficulty,
        String source,
        Instant createdAt
) {
}
