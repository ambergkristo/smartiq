package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.rate-limit")
public record RateLimitProperties(
        boolean enabled,
        int windowSeconds,
        int cardsNextPerMinute,
        int sessionAnswerPerMinute
) {
}
