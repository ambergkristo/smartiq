package com.smartiq.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.card.Card;
import com.smartiq.backend.card.CardRepository;
import com.smartiq.backend.card.TopicCountView;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "smartiq.import.enabled=true",
        "smartiq.import.path=classpath:import/cherrypick/cards.en.json",
        "smartiq.import.fail-on-category-threshold=false",
        "smartiq.dataset.min-category-threshold=0",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.language.et-enabled=false",
        "spring.flyway.placeholders.seed_core_enabled=false",
        "spring.datasource.url=jdbc:h2:mem:cherrypick_dataset_import_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class CherryPickDatasetImportIntegrationTest {

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private CardImportRunner cardImportRunner;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void importsOnlyDeterministicEnglishCherryPickCards() throws Exception {
        List<Card> cards = cardRepository.findAll();

        assertThat(cards).hasSize(2);
        assertThat(cards).extracting(Card::getId)
                .containsExactlyInAnyOrder("science-number-1", "history-true-false-1");
        assertThat(cards).allSatisfy(card -> {
            assertThat(card.getLanguage()).isEqualTo("en");
            assertThat(card.getOptions()).hasSize(8);
            assertThat(card.getCategory()).isNotEqualTo("ORDER");
        });

        Card numberCard = cardRepository.findById("science-number-1").orElseThrow();
        assertThat(numberCard.getCorrectIndex()).isEqualTo(7);
        assertThat(readMeta(numberCard)).containsEntry("correctIndex", 7);

        Card multiCard = cardRepository.findById("history-true-false-1").orElseThrow();
        assertThat(multiCard.getCorrectIndex()).isNull();
        assertThat(multiCard.getCorrectFlags()).isEqualTo("false,true,false,true,false,false,false,true");
        assertThat(readMeta(multiCard)).containsEntry("correctIndexes", List.of(1, 3, 7));
        assertThat(cardRepository.findTopicCounts())
                .extracting(TopicCountView::getTopic)
                .containsExactlyInAnyOrder("Science", "History");
    }

    @Test
    void rerunClearsPreviousRuntimeManagedRowsBeforeReimport() throws Exception {
        cardRepository.save(staleRuntimeCard());

        assertThat(cardRepository.findById("stale-runtime-card")).isPresent();

        cardImportRunner.run(new DefaultApplicationArguments());

        assertThat(cardRepository.findById("stale-runtime-card")).isEmpty();
        assertThat(cardRepository.findAll()).hasSize(2);
    }

    private Map<String, Object> readMeta(Card card) throws Exception {
        return objectMapper.readValue(card.getCorrectMeta(), new TypeReference<>() {
        });
    }

    private Card staleRuntimeCard() {
        Card card = new Card();
        card.setId("stale-runtime-card");
        card.setTopic("Stale");
        card.setSubtopic("OPEN");
        card.setCategory("OPEN");
        card.setLanguage("en");
        card.setQuestion("This stale runtime row must be replaced.");
        card.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H"));
        card.setCorrectIndex(0);
        card.setCorrectFlags("true,false,false,false,false,false,false,false");
        card.setCorrectMeta("{\"correctIndexes\":[0]}");
        card.setDifficulty("1");
        card.setSource("smartiq-human");
        card.setCreatedAt(Instant.parse("2026-03-12T00:00:00Z"));
        return card;
    }
}
