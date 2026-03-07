package com.smartiq.backend.card;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.language.et-enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_topic_filter_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class CardControllerTopicCountsLanguageFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @BeforeEach
    void setUp() {
        cardRepository.deleteAll();
        cardRepository.save(createCard("culture-en-1", "Culture", "en", "smartiq-v2"));
        cardRepository.save(createCard("et-only-1", "EtOnly", "et", "smartiq-v2"));
        cardRepository.save(createCard("deprecated-only-1", "DeprecatedOnly", "en", "smartiq-factory"));
    }

    @Test
    void topicsEndpointShowsOnlyPlayablePublicTopics() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].topic", hasItem("Culture")))
                .andExpect(jsonPath("$[*].topic", not(hasItem("EtOnly"))))
                .andExpect(jsonPath("$[*].topic", not(hasItem("DeprecatedOnly"))))
                .andExpect(jsonPath("$[?(@.topic=='Culture')].count", hasItem(1)));
    }

    private static Card createCard(String id, String topic, String language, String source) {
        Card card = new Card();
        card.setId(id);
        card.setTopic(topic);
        card.setSubtopic("OPEN");
        card.setCategory("OPEN");
        card.setLanguage(language);
        card.setQuestion("Question for " + topic);
        card.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        card.setCorrectIndex(0);
        card.setDifficulty("1");
        card.setSource(source);
        card.setCreatedAt(Instant.parse("2026-03-07T00:00:00Z"));
        return card;
    }
}
