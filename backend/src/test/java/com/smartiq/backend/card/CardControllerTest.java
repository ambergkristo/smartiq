package com.smartiq.backend.card;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=true",
        "smartiq.pool.minimum-per-key=1",
        "smartiq.pool.low-watermark-per-key=1",
        "smartiq.pool.refill-target-per-key=2",
        "spring.datasource.url=jdbc:h2:mem:smartiq_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class CardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @BeforeEach
    void setUp() {
        cardRepository.deleteAll();

        Card science = new Card();
        science.setId("science-1");
        science.setTopic("Science");
        science.setSubtopic("General Science");
        science.setLanguage("en");
        science.setQuestion("What planet is known as the Red Planet?");
        science.setOptions(List.of("Mars", "Earth", "Venus", "Jupiter", "Saturn", "Uranus", "Neptune", "Mercury", "Pluto", "Moon"));
        science.setCorrectIndex(0);
        science.setDifficulty("2");
        science.setSource("test");
        science.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(science);

        Card math = new Card();
        math.setId("math-1");
        math.setTopic("Math");
        math.setSubtopic("Addition");
        math.setLanguage("en");
        math.setQuestion("What is 2 + 2?");
        math.setOptions(List.of("4", "3", "5", "6", "7", "8", "9", "10", "11", "12"));
        math.setCorrectIndex(0);
        math.setDifficulty("2");
        math.setSource("test");
        math.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(math);

        Card math2 = new Card();
        math2.setId("math-2");
        math2.setTopic("Math");
        math2.setSubtopic("Addition");
        math2.setLanguage("en");
        math2.setQuestion("What is 3 + 3?");
        math2.setOptions(List.of("6", "5", "4", "7", "8", "9", "10", "11", "12", "13"));
        math2.setCorrectIndex(0);
        math2.setDifficulty("2");
        math2.setSource("test");
        math2.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(math2);
    }

    @Test
    void returnsTopicCounts() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].topic").value("Math"))
                .andExpect(jsonPath("$[1].topic").value("Science"));
    }

    @Test
    void returnsRandomCardByTopic() throws Exception {
        mockMvc.perform(get("/api/cards/random").param("topic", "Science"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Science"));
    }

    @Test
    void returnsRandomCardOverall() throws Exception {
        mockMvc.perform(get("/api/cards/random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void returnsNotFoundForMissingTopic() throws Exception {
        mockMvc.perform(get("/api/cards/random").param("topic", "Unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void returnsNextCardForTopicDifficultySession() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topic", "Math")
                        .param("difficulty", "2")
                        .param("sessionId", "test-session")
                        .param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Math"))
                .andExpect(jsonPath("$.difficulty").value("2"));
    }

    @Test
    void avoidsDuplicateCardsForSameSession() throws Exception {
        MvcResult first = mockMvc.perform(get("/api/cards/next")
                        .param("topic", "Math")
                        .param("difficulty", "2")
                        .param("sessionId", "session-1")
                        .param("lang", "en"))
                .andExpect(status().isOk())
                .andReturn();

        String firstId = JsonPath.read(first.getResponse().getContentAsString(), "$.id");

        MvcResult second = mockMvc.perform(get("/api/cards/next")
                        .param("topic", "Math")
                        .param("difficulty", "2")
                        .param("sessionId", "session-1")
                        .param("lang", "en"))
                .andExpect(status().isOk())
                .andReturn();

        String secondId = JsonPath.read(second.getResponse().getContentAsString(), "$.id");
        org.junit.jupiter.api.Assertions.assertNotEquals(firstId, secondId);
    }
}
