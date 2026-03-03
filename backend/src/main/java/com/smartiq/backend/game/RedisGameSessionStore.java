package com.smartiq.backend.game;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConditionalOnProperty(name = "smartiq.game.session-store", havingValue = "redis")
public class RedisGameSessionStore implements GameSessionStore {

    private final StringRedisTemplate redisTemplate;
    private final String keyPrefix;
    private final Duration ttl;

    public RedisGameSessionStore(StringRedisTemplate redisTemplate,
                                 @Value("${smartiq.game.session-redis-prefix:smartiq:game-session:}") String keyPrefix,
                                 @Value("${smartiq.game.session-retention-minutes:180}") long ttlMinutes) {
        this.redisTemplate = redisTemplate;
        this.keyPrefix = keyPrefix;
        this.ttl = Duration.ofMinutes(Math.max(1, ttlMinutes));
    }

    @Override
    public String read(String gameId) {
        return redisTemplate.opsForValue().get(key(gameId));
    }

    @Override
    public void write(String gameId, String payload) {
        redisTemplate.opsForValue().set(key(gameId), payload, ttl);
    }

    @Override
    public void delete(String gameId) {
        redisTemplate.delete(key(gameId));
    }

    private String key(String gameId) {
        return keyPrefix + gameId;
    }
}
