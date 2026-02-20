package com.smartiq.backend.card;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class CardDeckResponseMapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private CardDeckResponseMapper() {
    }

    static CardDeckResponse toDeckResponse(CardResponse card) {
        if (card.options() == null || card.options().size() != 10) {
            throw new InvalidCardContractException("Card must contain exactly 10 options: " + card.cardId());
        }

        String category = normalizeCategory(card.category());
        Map<String, Object> correct = resolveCorrect(category, card);

        return new CardDeckResponse(
                card.cardId(),
                category,
                card.topic(),
                card.language(),
                card.question(),
                List.copyOf(card.options()),
                correct,
                card.source(),
                null
        );
    }

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            throw new InvalidCardContractException("Card category missing");
        }
        return category.trim().toUpperCase();
    }

    private static Map<String, Object> resolveCorrect(String category, CardResponse card) {
        if (card.correctMeta() != null && !card.correctMeta().isBlank()) {
            try {
                return OBJECT_MAPPER.readValue(card.correctMeta(), new TypeReference<>() {
                });
            } catch (Exception ex) {
                throw new InvalidCardContractException("Invalid correct metadata JSON for " + card.cardId());
            }
        }

        if ("TRUE_FALSE".equals(category) || "OPEN".equals(category)) {
            List<Integer> indexes = parseCorrectIndexesFromFlags(card.correctFlags(), card.options().size());
            if (indexes.isEmpty() && card.correctIndex() != null) {
                indexes = List.of(card.correctIndex());
            }
            if (indexes.isEmpty()) {
                throw new InvalidCardContractException("Missing correct indexes for " + card.cardId());
            }
            return Map.of("correctIndexes", indexes);
        }

        if ("ORDER".equals(category)) {
            throw new InvalidCardContractException("ORDER card requires correct.rankByIndex metadata: " + card.cardId());
        }

        if (card.correctIndex() == null) {
            List<Integer> indexes = parseCorrectIndexesFromFlags(card.correctFlags(), card.options().size());
            if (indexes.size() == 1) {
                return Map.of("correctIndex", indexes.get(0));
            }
            throw new InvalidCardContractException("Missing correctIndex for " + card.cardId());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("correctIndex", card.correctIndex());
        if ("NUMBER".equals(category)) {
            payload.put("answerType", "number");
        }
        return payload;
    }

    private static List<Integer> parseCorrectIndexesFromFlags(String rawFlags, int optionCount) {
        if (rawFlags == null || rawFlags.isBlank()) {
            return List.of();
        }
        String[] parts = rawFlags.split(",");
        List<Integer> indexes = new ArrayList<>();
        int max = Math.min(parts.length, optionCount);
        for (int i = 0; i < max; i++) {
            if (Boolean.parseBoolean(parts[i].trim())) {
                indexes.add(i);
            }
        }
        return indexes;
    }
}
