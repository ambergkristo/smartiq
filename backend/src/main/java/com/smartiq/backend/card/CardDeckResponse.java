package com.smartiq.backend.card;

import java.util.List;
import java.util.Map;

public record CardDeckResponse(
        String cardId,
        String category,
        String topic,
        String language,
        String question,
        List<String> options,
        Map<String, Object> correct,
        String source,
        String explanation
) {
}
