package com.smartiq.backend.card;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "smartiq.session.store", havingValue = "redis")
public class RedisGameHistoryStore implements GameHistoryStore {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final String keyPrefix;
    private final Duration ttl;

    public RedisGameHistoryStore(StringRedisTemplate redisTemplate,
                                 ObjectMapper objectMapper,
                                 @org.springframework.beans.factory.annotation.Value("${smartiq.session.redis-prefix:smartiq:game-history:}") String keyPrefix,
                                 @org.springframework.beans.factory.annotation.Value("${smartiq.session.ttl-minutes:120}") long ttlMinutes) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.keyPrefix = keyPrefix;
        this.ttl = Duration.ofMinutes(Math.max(1, ttlMinutes));
    }

    @Override
    public List<DeckCardMeta> readRecent(String gameId, int limit) {
        if (limit <= 0) {
            return List.of();
        }

        String key = key(gameId);
        long start = -Math.max(1, limit);
        List<String> rawItems = redisTemplate.opsForList().range(key, start, -1);
        if (rawItems == null || rawItems.isEmpty()) {
            return List.of();
        }

        List<DeckCardMeta> items = new ArrayList<>(rawItems.size());
        for (String raw : rawItems) {
            try {
                items.add(objectMapper.readValue(raw, DeckCardMeta.class));
            } catch (Exception ignored) {
                // Ignore malformed history entries instead of failing card selection.
            }
        }
        return items;
    }

    @Override
    public void append(String gameId, DeckCardMeta cardMeta, int maxSize) {
        String key = key(gameId);
        try {
            String payload = objectMapper.writeValueAsString(cardMeta);
            redisTemplate.opsForList().rightPush(key, payload);
            if (maxSize > 0) {
                redisTemplate.opsForList().trim(key, -maxSize, -1);
            } else {
                redisTemplate.delete(key);
                return;
            }
            redisTemplate.expire(key, ttl);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to append game history to Redis", ex);
        }
    }

    @Override
    public void evict(String gameId) {
        redisTemplate.delete(key(gameId));
    }

    private String key(String gameId) {
        return keyPrefix + gameId;
    }
}
