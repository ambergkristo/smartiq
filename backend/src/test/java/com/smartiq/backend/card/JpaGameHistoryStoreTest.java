package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JpaGameHistoryStoreTest {

    @Test
    void readRecentReturnsAscendingOrder() {
        GameHistoryEntryRepository repository = mock(GameHistoryEntryRepository.class);
        JpaGameHistoryStore store = new JpaGameHistoryStore(repository);

        GameHistoryEntry newer = entry("game-1", "c2", "NUMBER", "Science", Instant.parse("2026-02-21T08:00:00Z"));
        GameHistoryEntry older = entry("game-1", "c1", "OPEN", "History", Instant.parse("2026-02-21T07:00:00Z"));
        when(repository.findRecentByGameId(eq("game-1"), any(Pageable.class))).thenReturn(List.of(newer, older));

        List<DeckCardMeta> result = store.readRecent("game-1", 20);

        assertThat(result).extracting(DeckCardMeta::cardId).containsExactly("c1", "c2");
    }

    @Test
    void appendTrimsOverflowWhenNeeded() {
        GameHistoryEntryRepository repository = mock(GameHistoryEntryRepository.class);
        JpaGameHistoryStore store = new JpaGameHistoryStore(repository);
        when(repository.countByGameId("game-1")).thenReturn(25L);
        when(repository.findOldestIds("game-1", 5)).thenReturn(List.of(1L, 2L, 3L, 4L, 5L));

        store.append("game-1", new DeckCardMeta("c99", "OPEN", "History"), 20);

        ArgumentCaptor<GameHistoryEntry> captor = ArgumentCaptor.forClass(GameHistoryEntry.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getCardId()).isEqualTo("c99");
        verify(repository).deleteAllByIdInBatch(List.of(1L, 2L, 3L, 4L, 5L));
    }

    @Test
    void appendDoesNotTrimWhenWithinLimit() {
        GameHistoryEntryRepository repository = mock(GameHistoryEntryRepository.class);
        JpaGameHistoryStore store = new JpaGameHistoryStore(repository);
        when(repository.countByGameId("game-2")).thenReturn(10L);

        store.append("game-2", new DeckCardMeta("c1", "OPEN", "History"), 20);

        verify(repository).save(any(GameHistoryEntry.class));
        verify(repository, never()).findOldestIds(eq("game-2"), any(Integer.class));
        verify(repository, never()).deleteAllByIdInBatch(any());
    }

    private static GameHistoryEntry entry(String gameId, String cardId, String category, String topic, Instant createdAt) {
        GameHistoryEntry entry = new GameHistoryEntry();
        entry.setGameId(gameId);
        entry.setCardId(cardId);
        entry.setCategory(category);
        entry.setTopic(topic);
        entry.setCreatedAt(createdAt);
        return entry;
    }
}
