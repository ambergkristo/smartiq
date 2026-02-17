package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "smartiq.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
