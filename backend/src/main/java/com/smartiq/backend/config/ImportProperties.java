package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.import")
public record ImportProperties(boolean enabled, String path) {
}