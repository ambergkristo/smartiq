package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.game")
public record GameSessionProperties(
        int sessionRetentionMinutes,
        int sessionMax
) {
}
