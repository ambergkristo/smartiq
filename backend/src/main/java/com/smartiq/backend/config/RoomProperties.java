package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.room")
public record RoomProperties(
        int roomRetentionMinutes,
        int roomMax
) {
}
