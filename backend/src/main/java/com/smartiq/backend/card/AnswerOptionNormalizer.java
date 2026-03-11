package com.smartiq.backend.card;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

final class AnswerOptionNormalizer {

    static final int BOARD_ANSWER_COUNT = 8;

    private AnswerOptionNormalizer() {
    }

    static Projection normalize(List<String> sourceOptions, List<Integer> priorityIndexes, String cardId) {
        if (sourceOptions == null || sourceOptions.size() < BOARD_ANSWER_COUNT) {
            throw new InvalidCardContractException("Card must contain at least 8 options: " + cardId);
        }

        LinkedHashSet<Integer> included = new LinkedHashSet<>();
        if (priorityIndexes != null) {
            for (Integer index : priorityIndexes) {
                if (index == null) {
                    continue;
                }
                if (index < 0 || index >= sourceOptions.size()) {
                    throw new InvalidCardContractException("Card correctness index is out of bounds: " + cardId);
                }
                included.add(index);
            }
        }

        for (int index = 0; index < sourceOptions.size() && included.size() < BOARD_ANSWER_COUNT; index++) {
            included.add(index);
        }

        if (included.size() < BOARD_ANSWER_COUNT) {
            throw new InvalidCardContractException("Card must contain at least 8 usable options: " + cardId);
        }

        List<String> normalizedOptions = new ArrayList<>(BOARD_ANSWER_COUNT);
        Map<Integer, Integer> sourceToNormalized = new LinkedHashMap<>();
        int normalizedIndex = 0;
        for (int sourceIndex = 0; sourceIndex < sourceOptions.size(); sourceIndex++) {
            if (!included.contains(sourceIndex)) {
                continue;
            }
            normalizedOptions.add(sourceOptions.get(sourceIndex));
            sourceToNormalized.put(sourceIndex, normalizedIndex);
            normalizedIndex += 1;
            if (normalizedIndex >= BOARD_ANSWER_COUNT) {
                break;
            }
        }

        return new Projection(List.copyOf(normalizedOptions), Map.copyOf(sourceToNormalized));
    }

    record Projection(
            List<String> options,
            Map<Integer, Integer> sourceToNormalized
    ) {
        Integer normalizedIndex(Integer sourceIndex) {
            return sourceToNormalized.get(sourceIndex);
        }

        List<Integer> normalizedIndexes(List<Integer> sourceIndexes, String cardId) {
            List<Integer> normalized = new ArrayList<>();
            for (Integer sourceIndex : sourceIndexes) {
                Integer mapped = normalizedIndex(sourceIndex);
                if (mapped == null) {
                    throw new InvalidCardContractException("Card correct answer is outside 8-answer board: " + cardId);
                }
                normalized.add(mapped);
            }
            return List.copyOf(normalized);
        }
    }
}
