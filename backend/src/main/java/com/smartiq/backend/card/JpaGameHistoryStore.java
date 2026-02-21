package com.smartiq.backend.card;

import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class JpaGameHistoryStore implements GameHistoryStore {

    private final GameHistoryEntryRepository repository;

    public JpaGameHistoryStore(GameHistoryEntryRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<DeckCardMeta> readRecent(String gameId, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        List<GameHistoryEntry> recentDesc = new ArrayList<>(
                repository.findRecentByGameId(gameId, PageRequest.of(0, limit))
        );
        if (recentDesc.isEmpty()) {
            return List.of();
        }

        Collections.reverse(recentDesc);
        List<DeckCardMeta> result = new ArrayList<>(recentDesc.size());
        for (GameHistoryEntry entry : recentDesc) {
            result.add(new DeckCardMeta(entry.getCardId(), entry.getCategory(), entry.getTopic()));
        }
        return result;
    }

    @Override
    public void append(String gameId, DeckCardMeta cardMeta, int maxSize) {
        if (maxSize <= 0) {
            repository.deleteByGameId(gameId);
            return;
        }

        GameHistoryEntry entry = new GameHistoryEntry();
        entry.setGameId(gameId);
        entry.setCardId(cardMeta.cardId());
        entry.setCategory(cardMeta.category());
        entry.setTopic(cardMeta.topic());
        entry.setCreatedAt(Instant.now());
        repository.save(entry);

        long count = repository.countByGameId(gameId);
        int overflow = (int) (count - maxSize);
        if (overflow > 0) {
            List<Long> oldestIds = repository.findOldestIds(gameId, overflow);
            if (!oldestIds.isEmpty()) {
                repository.deleteAllByIdInBatch(oldestIds);
            }
        }
    }

    @Override
    public void evict(String gameId) {
        repository.deleteByGameId(gameId);
    }
}
