package com.smartiq.backend.card;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryGameHistoryStore implements GameHistoryStore {

    private final ConcurrentHashMap<String, Deque<DeckCardMeta>> byGameId = new ConcurrentHashMap<>();

    @Override
    public List<DeckCardMeta> readRecent(String gameId, int limit) {
        Deque<DeckCardMeta> deque = byGameId.get(gameId);
        if (deque == null || limit <= 0) {
            return List.of();
        }

        synchronized (deque) {
            if (deque.isEmpty()) {
                return List.of();
            }
            int skip = Math.max(0, deque.size() - limit);
            List<DeckCardMeta> result = new ArrayList<>(Math.min(limit, deque.size()));
            int idx = 0;
            for (DeckCardMeta cardMeta : deque) {
                if (idx++ < skip) {
                    continue;
                }
                result.add(cardMeta);
            }
            return result;
        }
    }

    @Override
    public void append(String gameId, DeckCardMeta cardMeta, int maxSize) {
        if (maxSize <= 0) {
            byGameId.remove(gameId);
            return;
        }

        Deque<DeckCardMeta> deque = byGameId.computeIfAbsent(gameId, ignored -> new ArrayDeque<>());
        synchronized (deque) {
            deque.addLast(cardMeta);
            while (deque.size() > maxSize) {
                deque.removeFirst();
            }
        }
    }

    @Override
    public void evict(String gameId) {
        byGameId.remove(gameId);
    }
}
