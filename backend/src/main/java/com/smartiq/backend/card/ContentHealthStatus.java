package com.smartiq.backend.card;

public record ContentHealthStatus(
        boolean healthy,
        String message
) {
    public static ContentHealthStatus ok() {
        return new ContentHealthStatus(true, "");
    }

    public static ContentHealthStatus failed(String message) {
        return new ContentHealthStatus(false, message);
    }
}
