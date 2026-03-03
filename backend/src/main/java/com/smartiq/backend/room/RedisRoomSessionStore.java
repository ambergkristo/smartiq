package com.smartiq.backend.room;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConditionalOnProperty(name = "smartiq.room.session-store", havingValue = "redis")
public class RedisRoomSessionStore implements RoomSessionStore {

    private final StringRedisTemplate redisTemplate;
    private final String keyPrefix;
    private final Duration ttl;

    public RedisRoomSessionStore(StringRedisTemplate redisTemplate,
                                 @Value("${smartiq.room.session-redis-prefix:smartiq:room-session:}") String keyPrefix,
                                 @Value("${smartiq.room.room-retention-minutes:180}") long ttlMinutes) {
        this.redisTemplate = redisTemplate;
        this.keyPrefix = keyPrefix;
        this.ttl = Duration.ofMinutes(Math.max(1, ttlMinutes));
    }

    @Override
    public String read(String roomCode) {
        return redisTemplate.opsForValue().get(key(roomCode));
    }

    @Override
    public void write(String roomCode, String payload) {
        redisTemplate.opsForValue().set(key(roomCode), payload, ttl);
    }

    @Override
    public void delete(String roomCode) {
        redisTemplate.delete(key(roomCode));
    }

    private String key(String roomCode) {
        return keyPrefix + roomCode;
    }
}
