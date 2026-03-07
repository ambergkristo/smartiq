package com.smartiq.backend.card;

import java.util.List;
import java.util.Locale;

public final class CardSourcePolicy {

    public static final List<String> DEPRECATED_SOURCES = List.of(
            "smartiq-factory",
            "smartiq-generator-v1",
            "smart10-generator-v1"
    );

    public static final List<String> ALLOWED_SOURCES = List.of(
            "smartiq-v2",
            "smartiq-human",
            "smartiq-verified",
            "flyway-seed-core"
    );

    private CardSourcePolicy() {
    }

    public static String normalizeSource(String rawSource) {
        if (rawSource == null || rawSource.isBlank()) {
            throw new IllegalArgumentException("Card source is required");
        }
        return rawSource.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean isAllowed(String rawSource) {
        if (rawSource == null || rawSource.isBlank()) {
            return false;
        }
        return ALLOWED_SOURCES.contains(normalizeSource(rawSource));
    }
}
