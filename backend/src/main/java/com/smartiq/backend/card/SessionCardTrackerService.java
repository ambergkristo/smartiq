package com.smartiq.backend.card;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.smartiq.backend.config.SessionDedupProperties;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class SessionCardTrackerService {

    private static final int MAX_SESSION_ID_LENGTH = 128;

    private final SessionDedupProperties properties;
    private final Cache<String, Set<String>> sessionCardIds;

    public SessionCardTrackerService(SessionDedupProperties properties) {
        this.properties = properties;
        this.sessionCardIds = Caffeine.newBuilder()
                .expireAfterWrite(properties.ttlMinutes(), TimeUnit.MINUTES)
                .maximumSize(properties.maxSessions())
                .build();
    }

    public Set<String> servedIdsForSession(String sessionId) {
        if (!properties.enabled()) {
            return Collections.emptySet();
        }
        String normalized = normalizeSessionId(sessionId);
        if (normalized == null) {
            return Collections.emptySet();
        }
        return sessionCardIds.get(normalized, key -> ConcurrentHashMap.newKeySet());
    }

    public void markServed(String sessionId, String cardId) {
        if (!properties.enabled()) {
            return;
        }
        String normalized = normalizeSessionId(sessionId);
        if (normalized == null) {
            return;
        }
        servedIdsForSession(normalized).add(cardId);
    }

    public boolean tryMarkServed(String sessionId, String cardId) {
        if (!properties.enabled()) {
            return true;
        }
        String normalized = normalizeSessionId(sessionId);
        if (normalized == null) {
            return true;
        }
        return servedIdsForSession(normalized).add(cardId);
    }

    private static String normalizeSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        String normalized = sessionId.trim();
        if (normalized.length() > MAX_SESSION_ID_LENGTH) {
            throw new IllegalArgumentException("sessionId is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("sessionId contains control characters");
        }
        return normalized;
    }

    private static boolean containsControlChars(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl((char) ch));
    }
}
