package com.smartiq.backend.room.ws;

import com.smartiq.backend.config.CorsProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistration;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomWebSocketConfigTest {

    @Mock
    private RoomWebSocketHandler roomWebSocketHandler;

    @Mock
    private Environment environment;

    @Mock
    private WebSocketHandlerRegistry registry;

    @Mock
    private WebSocketHandlerRegistration registration;

    @Test
    void rejectsWildcardOriginInProd() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        RoomWebSocketConfig config = new RoomWebSocketConfig(
                roomWebSocketHandler,
                new CorsProperties(List.of("*")),
                environment
        );

        assertThatThrownBy(() -> config.registerWebSocketHandlers(registry))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Wildcard CORS origin is not allowed in prod.");
    }

    @Test
    void appliesConfiguredOriginsInProdWithoutDevPatterns() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(registry.addHandler(eq(roomWebSocketHandler), eq("/ws/rooms/*"))).thenReturn(registration);
        when(registration.setAllowedOrigins(any(String[].class))).thenReturn(registration);

        RoomWebSocketConfig config = new RoomWebSocketConfig(
                roomWebSocketHandler,
                new CorsProperties(List.of("https://smartiq.example")),
                environment
        );

        config.registerWebSocketHandlers(registry);

        verify(registration).setAllowedOrigins("https://smartiq.example");
        verify(registration, never()).setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
    }
}
