package com.smartiq.backend.card;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.profiles.active=prod",
        "smartiq.import.enabled=false",
        "smartiq.import.fail-on-category-threshold=false",
        "smartiq.pool.enabled=true",
        "smartiq.pool.minimum-per-key=1",
        "smartiq.pool.low-watermark-per-key=1",
        "smartiq.pool.refill-target-per-key=2",
        "smartiq.bank.block-on-low-bank=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_test_prod_headers;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class CardControllerDeprecationHeadersProdTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @BeforeEach
    void setUp() {
        cardRepository.deleteAll();

        Card card = new Card();
        card.setId("prod-header-open-1");
        card.setTopic("History");
        card.setSubtopic("General");
        card.setCategory("OPEN");
        card.setLanguage("en");
        card.setQuestion("Prod header smoke?");
        card.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        card.setCorrectIndex(0);
        card.setDifficulty("1");
        card.setSource("smartiq-v2");
        card.setCreatedAt(Instant.parse("2026-02-22T00:00:00Z"));
        cardRepository.save(card);
    }

    @Test
    void legacyEndpointsReturnGoneWithDeprecationHeadersInProd() throws Exception {
        mockMvc.perform(get("/api/cards/random").param("topic", "History"))
                .andExpect(status().isGone())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Sunset", "Thu, 31 Dec 2026 23:59:59 GMT"))
                .andExpect(header().string("Link", "</api/cards/nextRandom>; rel=\"successor-version\""))
                .andExpect(jsonPath("$.error")
                        .value("Legacy endpoint /api/cards/random is retired; use /api/cards/nextRandom"))
                .andExpect(jsonPath("$.status").value(410))
                .andExpect(jsonPath("$.reason").value("Gone"))
                .andExpect(jsonPath("$.path").value("/api/cards/random"));

                mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "History")
                        .param("difficulty", "1")
                        .param("lang", "en"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error")
                        .value("Legacy endpoint /api/cards/next is retired; use /api/cards/nextRandom"))
                .andExpect(jsonPath("$.status").value(410))
                .andExpect(jsonPath("$.reason").value("Gone"))
                .andExpect(jsonPath("$.path").value("/api/cards/next"))
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Sunset", "Thu, 31 Dec 2026 23:59:59 GMT"))
                .andExpect(header().string("Link", "</api/cards/nextRandom>; rel=\"successor-version\""));
    }

    @Test
    void nextRandomRemainsUndeprecatedInProd() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "prod-header-game"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Deprecation"))
                .andExpect(header().doesNotExist("Sunset"))
                .andExpect(header().doesNotExist("Link"));
    }
}
