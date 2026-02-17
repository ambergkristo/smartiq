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
        if (!properties.enabled() || sessionId == null || sessionId.isBlank()) {
            return Collections.emptySet();
        }
        return sessionCardIds.get(sessionId.trim(), key -> ConcurrentHashMap.newKeySet());
    }

    public void markServed(String sessionId, String cardId) {
        if (!properties.enabled() || sessionId == null || sessionId.isBlank()) {
            return;
        }
        servedIdsForSession(sessionId).add(cardId);
    }
}
