package com.smartiq.backend.card;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.deck-history.store=db",
        "spring.datasource.url=jdbc:h2:mem:smartiq_db_history_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
class NextRandomCardDbHistoryIntegrationTest {

    @Autowired
    private NextRandomCardService nextRandomCardService;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private GameHistoryEntryRepository gameHistoryEntryRepository;

    @BeforeEach
    void setUp() {
        gameHistoryEntryRepository.deleteAll();
        cardRepository.deleteAll();

        for (int i = 1; i <= 30; i++) {
            cardRepository.save(card(
                    "db-card-" + i,
                    i % 2 == 0 ? "History" : "Science",
                    i % 3 == 0 ? "TRUE_FALSE" : "OPEN"
            ));
        }
    }

    @Test
    void dbStorePersistsAndTrimsHistoryToLastK() {
        String gameId = "game-db-history";
        for (int i = 0; i < NextRandomCardService.LAST_K_DEFAULT + 5; i++) {
            nextRandomCardService.nextRandom("en", gameId, null);
        }

        assertThat(gameHistoryEntryRepository.countByGameId(gameId))
                .isEqualTo(NextRandomCardService.LAST_K_DEFAULT);

        List<GameHistoryEntry> recent = gameHistoryEntryRepository.findRecentByGameId(
                gameId,
                org.springframework.data.domain.PageRequest.of(0, 50)
        );
        assertThat(recent).hasSize(NextRandomCardService.LAST_K_DEFAULT);
        assertThat(recent).allMatch(entry -> gameId.equals(entry.getGameId()));
    }

    private static Card card(String id, String topic, String category) {
        Card card = new Card();
        card.setId(id);
        card.setTopic(topic);
        card.setSubtopic(category);
        card.setCategory(category);
        card.setLanguage("en");
        card.setQuestion("Question " + id);
        card.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        card.setCorrectIndex(0);
        card.setDifficulty("2");
        card.setSource("smartiq-v2");
        card.setCreatedAt(Instant.parse("2026-02-21T00:00:00Z"));
        return card;
    }
}
