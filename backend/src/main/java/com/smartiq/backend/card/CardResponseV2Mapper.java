package com.smartiq.backend.card;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

final class CardResponseV2Mapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private CardResponseV2Mapper() {
    }

    static CardNextResponseV2 toV2(CardResponse source) {
        if (source.options() == null || source.options().size() < AnswerOptionNormalizer.BOARD_ANSWER_COUNT) {
            throw new InvalidCardContractException("Card must contain at least 8 options: " + source.cardId());
        }

        int difficulty = parseDifficulty(source);
        String category = parseCategory(source.category());
        List<Integer> sourceCorrectIndexes = resolveCorrectIndexes(source);
        AnswerOptionNormalizer.Projection projection = AnswerOptionNormalizer.normalize(source.options(), sourceCorrectIndexes, source.cardId());
        List<Integer> correctIndexes = projection.normalizedIndexes(sourceCorrectIndexes, source.cardId());
        if (correctIndexes.isEmpty()) {
            throw new InvalidCardContractException("Card has no valid correct answers: " + source.cardId());
        }
        Map<String, Object> correct = resolveCorrect(source, category, correctIndexes);

        boolean multiCorrect = correctIndexes.size() > 1;
        Integer correctIndex = multiCorrect ? null : correctIndexes.get(0);

        List<CardOptionResponseV2> options = new ArrayList<>(projection.options().size());
        for (int i = 0; i < projection.options().size(); i++) {
            options.add(new CardOptionResponseV2(i, projection.options().get(i)));
        }

        return new CardNextResponseV2(
                source.id(),
                source.cardId(),
                category,
                source.topic(),
                source.subtopic(),
                source.language(),
                source.question(),
                List.copyOf(options),
                correctIndex,
                List.copyOf(correctIndexes),
                multiCorrect,
                correct,
                difficulty,
                source.source(),
                source.createdAt()
        );
    }

    private static String parseCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.isBlank()) {
            throw new InvalidCardContractException("Card category is missing");
        }
        return rawCategory.trim().toUpperCase();
    }

    private static int parseDifficulty(CardResponse source) {
        if (source.difficulty() == null || source.difficulty().isBlank()) {
            throw new InvalidCardContractException("Card difficulty is missing: " + source.cardId());
        }

        try {
            return Integer.parseInt(source.difficulty().trim());
        } catch (NumberFormatException ex) {
            throw new InvalidCardContractException("Card difficulty is not numeric: " + source.cardId());
        }
    }

    private static List<Integer> resolveCorrectIndexes(CardResponse source) {
        if (source.correctMeta() != null && !source.correctMeta().isBlank()) {
            List<Integer> fromMeta = parseCorrectIndexesFromMeta(source.correctMeta());
            if (!fromMeta.isEmpty()) {
                Collections.sort(fromMeta);
                return fromMeta;
            }
        }

        List<Integer> indexes = parseCorrectFlags(source.correctFlags(), source.options().size());
        if (!indexes.isEmpty()) {
            Collections.sort(indexes);
            return indexes;
        }

        if (source.correctIndex() != null) {
            int idx = source.correctIndex();
            if (idx < 0 || idx >= source.options().size()) {
                throw new InvalidCardContractException("Card correctIndex is out of bounds: " + source.cardId());
            }
            return List.of(idx);
        }

        throw new InvalidCardContractException("Card correctness metadata is missing: " + source.cardId());
    }

    private static List<Integer> parseCorrectIndexesFromMeta(String rawMeta) {
        try {
            Map<String, Object> parsed = OBJECT_MAPPER.readValue(rawMeta, new TypeReference<>() {
            });
            Object value = parsed.get("correctIndexes");
            if (!(value instanceof List<?> rawList)) {
                return List.of();
            }

            List<Integer> indexes = new ArrayList<>();
            for (Object item : rawList) {
                if (item instanceof Number num) {
                    indexes.add(num.intValue());
                }
            }
            return indexes;
        } catch (Exception ex) {
            throw new InvalidCardContractException("Card correctMeta is invalid JSON");
        }
    }

    private static List<Integer> parseCorrectFlags(String rawFlags, int optionCount) {
        if (rawFlags == null || rawFlags.isBlank()) {
            return List.of();
        }

        String[] parts = rawFlags.split(",");
        if (parts.length == 0) {
            return List.of();
        }

        List<Integer> indexes = new ArrayList<>();
        int limit = Math.min(parts.length, optionCount);
        for (int i = 0; i < limit; i++) {
            if (Boolean.parseBoolean(parts[i].trim())) {
                indexes.add(i);
            }
        }
        return indexes;
    }

    private static Map<String, Object> resolveCorrect(CardResponse source,
                                                      String category,
                                                      List<Integer> normalizedCorrectIndexes) {
        if (source.correctMeta() != null && !source.correctMeta().isBlank()) {
            try {
                Map<String, Object> parsed = OBJECT_MAPPER.readValue(source.correctMeta(), new TypeReference<>() {
                });
                if ("ORDER".equals(category)) {
                    List<Integer> rankByIndex = asIntegerList(parsed.get("rankByIndex"));
                    if (rankByIndex.size() < AnswerOptionNormalizer.BOARD_ANSWER_COUNT) {
                        throw new InvalidCardContractException("ORDER card must provide at least 8 ranks: " + source.cardId());
                    }
                    return Map.of("rankByIndex", List.copyOf(rankByIndex.subList(0, AnswerOptionNormalizer.BOARD_ANSWER_COUNT)));
                }
                return parsed;
            } catch (Exception ex) {
                throw new InvalidCardContractException("Card correctMeta is invalid JSON");
            }
        }

        if ("TRUE_FALSE".equals(category)) {
            return Map.of("correctIndexes", normalizedCorrectIndexes);
        }
        if (source.correctIndex() != null) {
            if (normalizedCorrectIndexes.isEmpty()) {
                throw new InvalidCardContractException("Card has no valid correct answers: " + source.cardId());
            }
            return Map.of("correctIndex", normalizedCorrectIndexes.get(0));
        }
        return Map.of("correctIndexes", normalizedCorrectIndexes);
    }

    private static List<Integer> asIntegerList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Integer> indexes = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Number num) {
                indexes.add(num.intValue());
            }
        }
        return List.copyOf(indexes);
    }
}
