package com.smartiq.backend.web;

import com.smartiq.backend.config.CorsProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig {

    private static final List<String> DEFAULT_DEV_ORIGINS = List.of("http://localhost:5173");
    private static final List<String> DEV_LOCALHOST_PATTERNS = List.of("http://localhost:*", "http://127.0.0.1:*");

    private final CorsProperties corsProperties;
    private final Environment environment;

    public CorsConfig(CorsProperties corsProperties, Environment environment) {
        this.corsProperties = corsProperties;
        this.environment = environment;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        configuration.setAllowCredentials(false);
        configuration.setAllowedOrigins(resolveAllowedOrigins());

        if (!isProdProfile()) {
            configuration.setAllowedOriginPatterns(DEV_LOCALHOST_PATTERNS);
        }

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    private List<String> resolveAllowedOrigins() {
        String configuredCsv = environment.getProperty("APP_CORS_ALLOWED_ORIGINS", "");
        List<String> fromEnv = Arrays.stream(configuredCsv.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toList());

        List<String> fromConfig = corsProperties.allowedOrigins() == null || corsProperties.allowedOrigins().isEmpty()
                ? DEFAULT_DEV_ORIGINS
                : corsProperties.allowedOrigins();

        List<String> resolved = fromEnv.isEmpty() ? fromConfig : fromEnv;

        if (isProdProfile() && resolved.stream().anyMatch("*"::equals)) {
            throw new IllegalStateException("Wildcard CORS origin is not allowed in prod.");
        }

        return resolved;
    }

    private boolean isProdProfile() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
    }
}
