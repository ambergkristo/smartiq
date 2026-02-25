package com.smartiq.backend.card;

import java.util.Locale;

public record QuestionPoolKey(String topic, String difficulty, String language) {

    private static final int MAX_COMPONENT_LENGTH = 128;

    public static QuestionPoolKey from(String topic, String difficulty, String language) {
        return new QuestionPoolKey(
                normalize(topic, "topic"),
                normalize(difficulty, "difficulty"),
                normalize(language == null || language.isBlank() ? "en" : language, "language")
        );
    }

    private static String normalize(String value, String fieldName) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > MAX_COMPONENT_LENGTH) {
            throw new IllegalArgumentException(fieldName + " is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException(fieldName + " contains control characters");
        }
        return normalized;
    }

    private static boolean containsControlChars(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl((char) ch));
    }
}
