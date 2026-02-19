package com.smartiq.backend.card;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;
import java.util.List;

public record CardResponse(
        String id,
        String cardId,
        String topic,
        String subtopic,
        String language,
        String question,
        List<String> options,
        Integer correctIndex,
        String difficulty,
        String source,
        Instant createdAt,
        @JsonIgnore String correctFlags
) {
    static CardResponse fromEntity(Card card) {
        return new CardResponse(
                card.getId(),
                card.getId(),
                card.getTopic(),
                card.getSubtopic(),
                card.getLanguage(),
                card.getQuestion(),
                card.getOptions(),
                card.getCorrectIndex(),
                card.getDifficulty(),
                card.getSource(),
                card.getCreatedAt(),
                card.getCorrectFlags()
        );
    }
}
