package com.smartiq.backend.card;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NextRandomCardServiceLanguageFallbackTest {

    @Mock
    private CardRepository cardRepository;

    @Mock
    private GameHistoryStore gameHistoryStore;

    private NextRandomCardService service;

    @BeforeEach
    void setUp() {
        service = new NextRandomCardService(cardRepository, gameHistoryStore);
    }

    @Test
    void fallsBackToEnglishWhenRequestedLanguageHasNoDeckPool() {
        Card englishCard = card("en-card-1", "History", "OPEN");
        englishCard.setLanguage("en");

        when(gameHistoryStore.readRecent(eq("game-1"), anyInt())).thenReturn(List.of());
        when(cardRepository.findDeckPool(eq("et"), eq((String) null), anyList())).thenReturn(List.of());
        when(cardRepository.findDeckPool(eq("en"), eq((String) null), anyList())).thenReturn(List.of(englishCard));

        Card selected = service.nextRandom("et", "game-1", null);

        assertThat(selected.getId()).isEqualTo("en-card-1");
        assertThat(selected.getLanguage()).isEqualTo("en");
        verify(cardRepository).findDeckPool(eq("et"), eq((String) null), anyList());
        verify(cardRepository).findDeckPool(eq("en"), eq((String) null), anyList());
    }

    @Test
    void keepsNotFoundWhenBothRequestedAndFallbackLanguageAreEmpty() {
        when(cardRepository.findDeckPool(eq("et"), eq((String) null), anyList())).thenReturn(List.of());
        when(cardRepository.findDeckPool(eq("en"), eq((String) null), anyList())).thenReturn(List.of());

        assertThatThrownBy(() -> service.nextRandom("et", "game-2", null))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("No cards available for language=et, topic=any");
    }

    @Test
    void fallbackPoolStillUsesAllowedSourcesOnly() {
        Card allowedEnglishCard = card("en-allowed-1", "History", "OPEN");
        allowedEnglishCard.setLanguage("en");
        allowedEnglishCard.setSource("smartiq-v2");

        when(gameHistoryStore.readRecent(eq("game-3"), anyInt())).thenReturn(List.of());
        when(cardRepository.findDeckPool(eq("et"), eq((String) null), anyList())).thenReturn(List.of());
        when(cardRepository.findDeckPool(eq("en"), eq((String) null), anyList())).thenReturn(List.of(allowedEnglishCard));

        Card selected = service.nextRandom("et", "game-3", null);

        assertThat(selected.getId()).isEqualTo("en-allowed-1");
        assertThat(selected.getSource()).isEqualTo("smartiq-v2");
    }

    private static Card card(String id, String topic, String category) {
        Card card = new Card();
        card.setId(id);
        card.setTopic(topic);
        card.setCategory(category);
        return card;
    }
}
