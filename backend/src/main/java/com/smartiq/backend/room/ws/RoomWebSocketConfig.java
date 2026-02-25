package com.smartiq.backend.room.ws;

import com.smartiq.backend.config.CorsProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSocket
public class RoomWebSocketConfig implements WebSocketConfigurer {

    private static final List<String> DEFAULT_DEV_ORIGINS = List.of("http://localhost:5173");
    private static final String[] DEV_LOCALHOST_PATTERNS = {"http://localhost:*", "http://127.0.0.1:*"};

    private final RoomWebSocketHandler roomWebSocketHandler;
    private final CorsProperties corsProperties;
    private final Environment environment;

    public RoomWebSocketConfig(RoomWebSocketHandler roomWebSocketHandler,
                               CorsProperties corsProperties,
                               Environment environment) {
        this.roomWebSocketHandler = roomWebSocketHandler;
        this.corsProperties = corsProperties;
        this.environment = environment;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        List<String> allowedOrigins = resolveAllowedOrigins();
        var registration = registry.addHandler(roomWebSocketHandler, "/ws/rooms/*")
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new));

        if (!isProdProfile()) {
            registration.setAllowedOriginPatterns(DEV_LOCALHOST_PATTERNS);
        }
    }

    private List<String> resolveAllowedOrigins() {
        String configuredCsv = environment.getProperty("APP_CORS_ALLOWED_ORIGINS", "");
        if (configuredCsv == null) {
            configuredCsv = "";
        }
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
