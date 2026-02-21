package com.smartiq.backend.card;

import java.util.List;

public interface GameHistoryStore {

    List<DeckCardMeta> readRecent(String gameId, int limit);

    void append(String gameId, DeckCardMeta cardMeta, int maxSize);

    void evict(String gameId);
}
