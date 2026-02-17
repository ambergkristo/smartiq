package com.smartiq.backend.card;

public record QuestionPoolKey(String topic, String difficulty, String language) {
    public static QuestionPoolKey from(String topic, String difficulty, String language) {
        return new QuestionPoolKey(
                normalize(topic),
                normalize(difficulty),
                normalize(language == null || language.isBlank() ? "en" : language)
        );
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }
}
