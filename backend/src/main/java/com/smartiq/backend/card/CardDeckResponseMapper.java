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
        String category = normalizeCategory(card.category());
        AnswerOptionNormalizer.Projection projection = normalizeProjection(category, card);
        Map<String, Object> correct = resolveCorrect(category, card, projection);

        return new CardDeckResponse(
                card.cardId(),
                category,
                card.topic(),
                card.language(),
                card.question(),
                projection.options(),
                correct,
                card.difficulty(),
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

    private static AnswerOptionNormalizer.Projection normalizeProjection(String category, CardResponse card) {
        if ("ORDER".equals(category)) {
            return AnswerOptionNormalizer.normalize(card.options(), List.of(), card.cardId());
        }

        List<Integer> correctIndexes = sourceCorrectIndexes(category, card);
        return AnswerOptionNormalizer.normalize(card.options(), correctIndexes, card.cardId());
    }

    private static Map<String, Object> resolveCorrect(String category, CardResponse card, AnswerOptionNormalizer.Projection projection) {
        if (card.correctMeta() != null && !card.correctMeta().isBlank()) {
            if ("ORDER".equals(category)) {
                Map<String, Object> parsed = parseCorrectMeta(card.cardId(), card.correctMeta());
                List<Integer> rankByIndex = asIntegerList(parsed.get("rankByIndex"));
                if (rankByIndex.isEmpty()) {
                    throw new InvalidCardContractException("ORDER card requires correct.rankByIndex metadata: " + card.cardId());
                }
                if (rankByIndex.size() < AnswerOptionNormalizer.BOARD_ANSWER_COUNT) {
                    throw new InvalidCardContractException("ORDER card must provide at least 8 ranks: " + card.cardId());
                }
                return Map.of("rankByIndex", List.copyOf(rankByIndex.subList(0, AnswerOptionNormalizer.BOARD_ANSWER_COUNT)));
            }

            try {
                Map<String, Object> parsed = parseCorrectMeta(card.cardId(), card.correctMeta());
                List<Integer> sourceIndexes = asIntegerList(parsed.get("correctIndexes"));
                if (!sourceIndexes.isEmpty()) {
                    return Map.of("correctIndexes", projection.normalizedIndexes(sourceIndexes, card.cardId()));
                }
                Integer sourceIndex = asInteger(parsed.get("correctIndex"));
                if (sourceIndex != null) {
                    Integer mapped = projection.normalizedIndex(sourceIndex);
                    if (mapped == null) {
                        throw new InvalidCardContractException("Card correct answer is outside 8-answer board: " + card.cardId());
                    }
                    return Map.of("correctIndex", mapped);
                }
                return parsed;
            } catch (Exception ex) {
                throw new InvalidCardContractException("Invalid correct metadata JSON for " + card.cardId());
            }
        }

        if ("TRUE_FALSE".equals(category) || "OPEN".equals(category)) {
            List<Integer> indexes = sourceCorrectIndexes(category, card);
            if (indexes.isEmpty()) {
                throw new InvalidCardContractException("Missing correct indexes for " + card.cardId());
            }
            return Map.of("correctIndexes", projection.normalizedIndexes(indexes, card.cardId()));
        }

        if ("ORDER".equals(category)) {
            throw new InvalidCardContractException("ORDER card requires correct.rankByIndex metadata: " + card.cardId());
        }

        List<Integer> indexes = sourceCorrectIndexes(category, card);
        if (indexes.size() != 1) {
            throw new InvalidCardContractException("Missing correctIndex for " + card.cardId());
        }
        Integer mapped = projection.normalizedIndex(indexes.get(0));
        if (mapped == null) {
            throw new InvalidCardContractException("Card correct answer is outside 8-answer board: " + card.cardId());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("correctIndex", mapped);
        if ("NUMBER".equals(category)) {
            payload.put("answerType", "number");
        }
        return payload;
    }

    private static List<Integer> sourceCorrectIndexes(String category, CardResponse card) {
        List<Integer> indexes = parseCorrectIndexesFromFlags(card.correctFlags(), card.options() == null ? 0 : card.options().size());
        if (indexes.isEmpty() && card.correctIndex() != null && !"ORDER".equals(category)) {
            return List.of(card.correctIndex());
        }
        return indexes;
    }

    private static Map<String, Object> parseCorrectMeta(String cardId, String rawMeta) {
        try {
            return OBJECT_MAPPER.readValue(rawMeta, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new InvalidCardContractException("Invalid correct metadata JSON for " + cardId);
        }
    }

    private static Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static List<Integer> asIntegerList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Integer> parsed = new ArrayList<>();
        for (Object item : list) {
            Integer normalized = asInteger(item);
            if (normalized != null) {
                parsed.add(normalized);
            }
        }
        return List.copyOf(parsed);
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
