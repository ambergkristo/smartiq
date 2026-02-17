package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.pool")
public record QuestionPoolProperties(
        boolean enabled,
        int minimumPerKey,
        int lowWatermarkPerKey,
        int refillTargetPerKey
) {
}
