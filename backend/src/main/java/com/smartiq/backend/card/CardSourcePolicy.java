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
            "smartiq-verified"
    );

    public static final String DEFAULT_ALLOWED_SOURCE = "smartiq-v2";

    private CardSourcePolicy() {
    }

    public static String normalizeSource(String rawSource) {
        if (rawSource == null || rawSource.isBlank()) {
            return DEFAULT_ALLOWED_SOURCE;
        }
        return rawSource.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean isAllowed(String rawSource) {
        return ALLOWED_SOURCES.contains(normalizeSource(rawSource));
    }
}
