package com.smartiq.backend.card;

import java.time.Instant;
import java.util.List;

public record CardResponse(
        String id,
        String topic,
        String subtopic,
        String language,
        String question,
        List<String> options,
        Integer correctIndex,
        String difficulty,
        String source,
        Instant createdAt
) {
    static CardResponse fromEntity(Card card) {
        return new CardResponse(
                card.getId(),
                card.getTopic(),
                card.getSubtopic(),
                card.getLanguage(),
                card.getQuestion(),
                card.getOptions(),
                card.getCorrectIndex(),
                card.getDifficulty(),
                card.getSource(),
                card.getCreatedAt()
        );
    }
}