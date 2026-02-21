package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryGameHistoryStoreTest {

    @Test
    void appendTrimsHistoryToLastK() {
        InMemoryGameHistoryStore store = new InMemoryGameHistoryStore();

        store.append("game-1", new DeckCardMeta("c1", "OPEN", "History"), 2);
        store.append("game-1", new DeckCardMeta("c2", "OPEN", "History"), 2);
        store.append("game-1", new DeckCardMeta("c3", "OPEN", "History"), 2);

        List<DeckCardMeta> history = store.readRecent("game-1", 20);
        assertThat(history).extracting(DeckCardMeta::cardId).containsExactly("c2", "c3");
    }

    @Test
    void evictRemovesGameHistory() {
        InMemoryGameHistoryStore store = new InMemoryGameHistoryStore();
        store.append("game-2", new DeckCardMeta("c1", "OPEN", "History"), 20);

        store.evict("game-2");

        assertThat(store.readRecent("game-2", 20)).isEmpty();
    }
}
