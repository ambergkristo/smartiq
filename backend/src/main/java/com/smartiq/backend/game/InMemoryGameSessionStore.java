package com.smartiq.backend.game;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
@ConditionalOnProperty(name = "smartiq.game.session-store", havingValue = "memory", matchIfMissing = true)
public class InMemoryGameSessionStore implements GameSessionStore {

    private final ConcurrentMap<String, String> payloadByGameId = new ConcurrentHashMap<>();

    @Override
    public String read(String gameId) {
        return payloadByGameId.get(gameId);
    }

    @Override
    public void write(String gameId, String payload) {
        payloadByGameId.put(gameId, payload);
    }

    @Override
    public void delete(String gameId) {
        payloadByGameId.remove(gameId);
    }
}
