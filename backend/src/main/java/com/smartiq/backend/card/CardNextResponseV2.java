package com.smartiq.backend.card;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CardNextResponseV2(
        String id,
        String cardId,
        String category,
        String topic,
        String subtopic,
        String language,
        String question,
        List<CardOptionResponseV2> options,
        Integer correctIndex,
        List<Integer> correctIndexes,
        boolean multiCorrect,
        Map<String, Object> correct,
        int difficulty,
        String source,
        Instant createdAt,
        String explanation
) {
}
