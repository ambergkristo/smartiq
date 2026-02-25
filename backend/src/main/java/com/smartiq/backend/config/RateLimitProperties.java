package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.rate-limit")
public record RateLimitProperties(
        boolean enabled,
        int windowSeconds,
        boolean trustForwardedFor,
        int wsRoomsPerMinute,
        int cardsNextPerMinute,
        int sessionAnswerPerMinute,
        int gamePerMinute,
        int roomsPerMinute
) {
}
