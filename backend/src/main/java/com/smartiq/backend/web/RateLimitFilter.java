package com.smartiq.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.RateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties properties;
    private final ObjectMapper objectMapper;
    private final boolean legacyShapeEnabled;
    private final ConcurrentHashMap<String, CounterWindow> counters = new ConcurrentHashMap<>();

    public RateLimitFilter(
            RateLimitProperties properties,
            ObjectMapper objectMapper,
            @Value("${smartiq.api.errors.legacy-shape-enabled:false}") boolean legacyShapeEnabled
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.legacyShapeEnabled = legacyShapeEnabled;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!properties.enabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String uri = request.getRequestURI();
        LimitRule rule = resolveLimit(uri);
        if (rule == null || rule.limit() <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = rule.bucket() + "|" + clientIp(request);
        long nowSeconds = Instant.now().getEpochSecond();
        CounterWindow window = counters.compute(key, (ignored, current) -> refreshWindow(current, nowSeconds));

        if (window.count() > rule.limit()) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(Math.max(1, window.windowStart() + properties.windowSeconds() - nowSeconds)));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            String message = "Rate limit exceeded for " + uri;
            Object body = legacyShapeEnabled
                    ? ApiErrorResponse.legacy(message)
                    : ApiErrorResponse.of(HttpStatus.TOO_MANY_REQUESTS, message, uri);
            objectMapper.writeValue(response.getWriter(), body);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private LimitRule resolveLimit(String uri) {
        if ("/api/cards/next".equals(uri) || "/api/cards/nextRandom".equals(uri)) {
            return new LimitRule("cards-next", properties.cardsNextPerMinute());
        }
        if ("/api/session/answer".equals(uri)) {
            return new LimitRule("session-answer", properties.sessionAnswerPerMinute());
        }
        if ("/api/game".equals(uri) || uri.startsWith("/api/game/")) {
            return new LimitRule("game-api", properties.gamePerMinute());
        }
        if ("/api/rooms".equals(uri) || uri.startsWith("/api/rooms/")) {
            return new LimitRule("rooms-api", properties.roomsPerMinute());
        }
        if (uri.startsWith("/ws/rooms/")) {
            return new LimitRule("ws-rooms", properties.wsRoomsPerMinute());
        }
        return null;
    }

    private CounterWindow refreshWindow(CounterWindow current, long nowSeconds) {
        if (current == null || nowSeconds - current.windowStart() >= properties.windowSeconds()) {
            return new CounterWindow(nowSeconds, 1);
        }
        return new CounterWindow(current.windowStart(), current.count() + 1);
    }

    private String clientIp(HttpServletRequest request) {
        if (properties.trustForwardedFor()) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                String candidate = forwardedFor.split(",")[0].trim();
                if (!candidate.isBlank()) {
                    return candidate;
                }
            }
        }
        return request.getRemoteAddr();
    }

    private record LimitRule(String bucket, int limit) {
    }

    private record CounterWindow(long windowStart, int count) {
    }
}
