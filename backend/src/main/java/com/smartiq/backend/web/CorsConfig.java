package com.smartiq.backend.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.smartiq.backend.config.CorsProperties;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final CorsProperties corsProperties;
    private final Environment environment;

    public CorsConfig(CorsProperties corsProperties, Environment environment) {
        this.corsProperties = corsProperties;
        this.environment = environment;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> allowedOrigins = resolveAllowedOrigins();
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization")
                .allowCredentials(false);
    }

    private List<String> resolveAllowedOrigins() {
        String configuredCsv = environment.getProperty("APP_CORS_ALLOWED_ORIGINS", "");
        List<String> fromEnv = Arrays.stream(configuredCsv.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());

        List<String> resolved = fromEnv.isEmpty()
                ? (corsProperties.allowedOrigins() == null || corsProperties.allowedOrigins().isEmpty()
                ? List.of("http://localhost:5173")
                : corsProperties.allowedOrigins())
                : fromEnv;

        if (isProdProfile() && resolved.stream().anyMatch("*"::equals)) {
            throw new IllegalStateException("Wildcard CORS origin is not allowed in prod.");
        }

        return resolved;
    }

    private boolean isProdProfile() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
    }
}
