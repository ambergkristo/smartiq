package com.smartiq.backend.web;

import com.smartiq.backend.card.Card;
import com.smartiq.backend.card.CardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.rate-limit.enabled=true",
        "smartiq.rate-limit.window-seconds=60",
        "smartiq.rate-limit.trust-forwarded-for=false",
        "smartiq.rate-limit.cards-next-per-minute=2",
        "smartiq.rate-limit.session-answer-per-minute=2",
        "smartiq.rate-limit.game-per-minute=2",
        "smartiq.rate-limit.rooms-per-minute=2",
        "spring.datasource.url=jdbc:h2:mem:smartiq_rate_limit_forwarded_hardening_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class RateLimitForwardedHeaderHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @BeforeEach
    void setUp() {
        cardRepository.deleteAll();
        Card card = new Card();
        card.setId("math-rate-limit-forwarded-hardening");
        card.setTopic("Math");
        card.setSubtopic("General");
        card.setCategory("OPEN");
        card.setLanguage("en");
        card.setQuestion("Rate limit forwarded header hardening");
        card.setOptions(List.of("1", "2", "3", "4", "5", "6", "7", "8", "9", "10"));
        card.setCorrectIndex(0);
        card.setDifficulty("1");
        card.setSource("smartiq-v2");
        card.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(card);
    }

    @Test
    void ignoresSpoofedForwardedHeaderWhenTrustDisabled() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .param("language", "en")
                        .param("gameId", "fh-ignore-1"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "203.0.113.11")
                        .param("language", "en")
                        .param("gameId", "fh-ignore-2"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cards/nextRandom")
                        .header("X-Forwarded-For", "203.0.113.12")
                        .param("language", "en")
                        .param("gameId", "fh-ignore-3"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.reason").value("Too Many Requests"))
                .andExpect(jsonPath("$.path").value("/api/cards/nextRandom"))
                .andExpect(jsonPath("$.error").value("Rate limit exceeded for /api/cards/nextRandom"));
    }

    @Test
    void bucketsByRemoteAddressWhenTrustDisabled() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .with(remoteAddress("10.10.0.1"))
                        .header("X-Forwarded-For", "198.51.100.1")
                        .param("language", "en")
                        .param("gameId", "fh-remote-1"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cards/nextRandom")
                        .with(remoteAddress("10.10.0.1"))
                        .header("X-Forwarded-For", "198.51.100.2")
                        .param("language", "en")
                        .param("gameId", "fh-remote-2"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cards/nextRandom")
                        .with(remoteAddress("10.10.0.2"))
                        .header("X-Forwarded-For", "198.51.100.3")
                        .param("language", "en")
                        .param("gameId", "fh-remote-3"))
                .andExpect(status().isOk());
    }

    private static RequestPostProcessor remoteAddress(String remoteAddr) {
        return request -> {
            request.setRemoteAddr(remoteAddr);
            return request;
        };
    }
}
