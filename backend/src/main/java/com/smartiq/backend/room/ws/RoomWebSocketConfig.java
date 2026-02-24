package com.smartiq.backend.room.ws;

import com.smartiq.backend.config.CorsProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;
import java.util.List;

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
        if (corsProperties.allowedOrigins() == null || corsProperties.allowedOrigins().isEmpty()) {
            return DEFAULT_DEV_ORIGINS;
        }
        return corsProperties.allowedOrigins();
    }

    private boolean isProdProfile() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
    }
}
