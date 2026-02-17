package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "smartiq.internal-access")
public record InternalAccessProperties(
        boolean enabled,
        String apiKeyHeader,
        String apiKey,
        List<String> protectedActuatorPaths
) {
}
