package com.smartiq.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.RateLimitProperties;
import io.micrometer.core.instrument.MeterRegistry;
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
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_CLIENT_KEY_LENGTH = 64;
    private static final String FALLBACK_CLIENT_KEY = "unknown";
    private static final String METRIC_RATE_LIMIT_BLOCKED = "smartiq.rate.limit.blocked.total";

    private final RateLimitProperties properties;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final boolean legacyShapeEnabled;
    private final ConcurrentHashMap<String, CounterWindow> counters = new ConcurrentHashMap<>();

    public RateLimitFilter(
            RateLimitProperties properties,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry,
            @Value("${smartiq.api.errors.legacy-shape-enabled:false}") boolean legacyShapeEnabled
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
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

        long nowSeconds = Instant.now().getEpochSecond();
        pruneCountersIfNeeded(nowSeconds);
        String key = rule.bucket() + "|" + clientIp(request);
        CounterWindow window = counters.compute(key, (ignored, current) -> refreshWindow(current, nowSeconds));

        if (window.count() > rule.limit()) {
            meterRegistry.counter(METRIC_RATE_LIMIT_BLOCKED, "bucket", rule.bucket()).increment();
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

    private void pruneCountersIfNeeded(long nowSeconds) {
        int maxCounters = Math.max(1, properties.counterMax());
        if (counters.size() <= maxCounters) {
            return;
        }

        long staleBefore = nowSeconds - properties.windowSeconds();
        counters.forEach((key, window) -> {
            if (window.windowStart() <= staleBefore) {
                counters.remove(key, window);
            }
        });

        int remainingExcess = counters.size() - maxCounters;
        if (remainingExcess <= 0) {
            return;
        }

        counters.entrySet().stream()
                .sorted(Comparator
                        .comparingLong((Map.Entry<String, CounterWindow> entry) -> entry.getValue().windowStart())
                        .thenComparing(Map.Entry::getKey))
                .limit(remainingExcess)
                .forEach(entry -> counters.remove(entry.getKey(), entry.getValue()));
    }

    private String clientIp(HttpServletRequest request) {
        if (properties.trustForwardedFor()) {
            String candidate = forwardedClientIp(request.getHeader("X-Forwarded-For"));
            if (candidate != null) {
                return candidate;
            }
        }
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return FALLBACK_CLIENT_KEY;
        }
        String normalized = remoteAddr.trim();
        if (normalized.length() > MAX_CLIENT_KEY_LENGTH) {
            return FALLBACK_CLIENT_KEY;
        }
        return normalized;
    }

    private static String forwardedClientIp(String forwardedFor) {
        if (forwardedFor == null || forwardedFor.isBlank()) {
            return null;
        }
        String candidate = forwardedFor.split(",")[0].trim();
        if (candidate.isBlank() || candidate.length() > MAX_CLIENT_KEY_LENGTH) {
            return null;
        }
        return candidate;
    }

    private record LimitRule(String bucket, int limit) {
    }

    private record CounterWindow(long windowStart, int count) {
    }
}
