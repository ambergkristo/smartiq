package com.smartiq.backend.card;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class CardResponseV2Mapper {

    private CardResponseV2Mapper() {
    }

    static CardNextResponseV2 toV2(CardResponse source) {
        if (source.options() == null || source.options().size() != 10) {
            throw new InvalidCardContractException("Card must contain exactly 10 options: " + source.cardId());
        }

        int difficulty = parseDifficulty(source);
        List<Integer> correctIndexes = resolveCorrectIndexes(source);
        if (correctIndexes.isEmpty()) {
            throw new InvalidCardContractException("Card has no valid correct answers: " + source.cardId());
        }

        boolean multiCorrect = correctIndexes.size() > 1;
        Integer correctIndex = multiCorrect ? null : correctIndexes.get(0);

        List<CardOptionResponseV2> options = new ArrayList<>(source.options().size());
        for (int i = 0; i < source.options().size(); i++) {
            options.add(new CardOptionResponseV2(i, source.options().get(i)));
        }

        return new CardNextResponseV2(
                source.id(),
                source.cardId(),
                source.topic(),
                source.subtopic(),
                source.language(),
                source.question(),
                List.copyOf(options),
                correctIndex,
                List.copyOf(correctIndexes),
                multiCorrect,
                difficulty,
                source.source(),
                source.createdAt()
        );
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
}
