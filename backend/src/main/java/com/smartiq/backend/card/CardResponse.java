package com.smartiq.backend.card;

import java.time.Instant;
import java.util.List;

public record CardResponse(
        String id,
        String cardId,
        String topic,
        String subtopic,
        String category,
        String language,
        String question,
        List<String> options,
        Integer correctIndex,
        String difficulty,
        String source,
        Instant createdAt,
        String correctFlags,
        String correctMeta,
        String explanation
) {
    static CardResponse fromEntity(Card card) {
        return new CardResponse(
                card.getId(),
                card.getId(),
                card.getTopic(),
                card.getSubtopic(),
                card.getCategory(),
                card.getLanguage(),
                card.getQuestion(),
                card.getOptions(),
                card.getCorrectIndex(),
                card.getDifficulty(),
                card.getSource(),
                card.getCreatedAt(),
                card.getCorrectFlags(),
                card.getCorrectMeta(),
                card.getExplanation()
        );
    }
}
