package com.smartiq.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.RateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties properties;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, CounterWindow> counters = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!properties.enabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        int limit = resolveLimit(request.getRequestURI());
        if (limit <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = request.getRequestURI() + "|" + clientIp(request);
        long nowSeconds = Instant.now().getEpochSecond();
        CounterWindow window = counters.compute(key, (ignored, current) -> refreshWindow(current, nowSeconds));

        if (window.count() > limit) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(Math.max(1, window.windowStart() + properties.windowSeconds() - nowSeconds)));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", 429,
                    "error", "Too Many Requests",
                    "message", "Rate limit exceeded for " + request.getRequestURI()
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private int resolveLimit(String uri) {
        if ("/api/cards/next".equals(uri) || "/api/cards/nextRandom".equals(uri)) {
            return properties.cardsNextPerMinute();
        }
        if ("/api/session/answer".equals(uri)) {
            return properties.sessionAnswerPerMinute();
        }
        return -1;
    }

    private CounterWindow refreshWindow(CounterWindow current, long nowSeconds) {
        if (current == null || nowSeconds - current.windowStart() >= properties.windowSeconds()) {
            return new CounterWindow(nowSeconds, 1);
        }
        return new CounterWindow(current.windowStart(), current.count() + 1);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record CounterWindow(long windowStart, int count) {
    }
}
