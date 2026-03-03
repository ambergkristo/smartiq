package com.smartiq.backend.web;

import com.smartiq.backend.card.Card;
import com.smartiq.backend.card.CardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.rate-limit.enabled=true",
        "smartiq.rate-limit.window-seconds=60",
        "smartiq.rate-limit.trust-forwarded-for=true",
        "smartiq.rate-limit.counter-max=2",
        "smartiq.rate-limit.ws-rooms-per-minute=2",
        "smartiq.rate-limit.cards-next-per-minute=1",
        "smartiq.rate-limit.game-per-minute=2",
        "smartiq.rate-limit.rooms-per-minute=2",
        "spring.datasource.url=jdbc:h2:mem:smartiq_rate_limit_prune_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class RateLimitCounterPruningTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @BeforeEach
    void setUp() {
        cardRepository.deleteAll();
        Card card = new Card();
        card.setId("rate-limit-prune-card");
        card.setTopic("Math");
        card.setSubtopic("General");
        card.setCategory("OPEN");
        card.setLanguage("en");
        card.setQuestion("Rate limit prune question");
        card.setOptions(List.of("1", "2", "3", "4", "5", "6", "7", "8", "9", "10"));
        card.setCorrectIndex(0);
        card.setDifficulty("1");
        card.setSource("smartiq-v2");
        card.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(card);
    }

    @Test
    void evictsOldestCounterEntryWhenCounterMapExceedsCap() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "10.0.1.1")
                        .param("language", "en")
                        .param("gameId", "prune-1"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "10.0.1.2")
                        .param("language", "en")
                        .param("gameId", "prune-2"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "10.0.1.3")
                        .param("language", "en")
                        .param("gameId", "prune-3"))
                .andExpect(status().isOk());

        // If oldest entry is not pruned, this would exceed limit=1 for 10.0.1.1.
        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "10.0.1.1")
                        .param("language", "en")
                        .param("gameId", "prune-4"))
                .andExpect(status().isOk());
    }
}
