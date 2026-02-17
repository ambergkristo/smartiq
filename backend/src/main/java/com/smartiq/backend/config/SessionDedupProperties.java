package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.session")
public record SessionDedupProperties(
        boolean enabled,
        int ttlMinutes,
        int maxSessions
) {
}
