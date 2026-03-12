package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=true",
        "smartiq.import.path=classpath:data/runtime/cards.et.json",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "spring.flyway.placeholders.seed_core_enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_runtime_et_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class RuntimeEstonianDatasetTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @Test
    void nextRandomServesBundledEstonianRuntimeCards() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "et")
                        .param("gameId", "runtime-et-1")
                        .param("topic", "Science"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Science"))
                .andExpect(jsonPath("$.language").value("et"))
                .andExpect(jsonPath("$.source").value("smartiq-verified"))
                .andExpect(jsonPath("$.options.length()").value(8))
                .andExpect(jsonPath("$.question").value(not(org.hamcrest.Matchers.containsString("seed question"))));
    }

    @Test
    void bundledEstonianRuntimeImportPreservesUtf8Characters() {
        boolean hasUtf8Question = cardRepository.findAll().stream()
                .map(Card::getQuestion)
                .filter(question -> question != null && !question.isBlank())
                .anyMatch(question -> question.contains("\u00f5")
                        || question.contains("\u00e4")
                        || question.contains("\u00f6")
                        || question.contains("\u00fc"));

        assertThat(hasUtf8Question).isTrue();
    }

    @Test
    void apiPreservesUtf8CharactersForEstonianCards() throws Exception {
        Card utf8Card = new Card();
        utf8Card.setId("runtime-et-utf8-card");
        utf8Card.setTopic("Utf8Topic");
        utf8Card.setSubtopic("OPEN");
        utf8Card.setCategory("OPEN");
        utf8Card.setLanguage("et");
        utf8Card.setQuestion("Milline s\u00f5na sisaldab t\u00e4hti \u00f5\u00e4\u00f6\u00fc?");
        utf8Card.setOptions(List.of("\u00d5\u00e4\u00f6\u00fc", "A", "B", "C", "D", "E", "F", "G"));
        utf8Card.setCorrectIndex(0);
        utf8Card.setDifficulty("2");
        utf8Card.setSource("smartiq-v2");
        utf8Card.setCreatedAt(Instant.parse("2026-03-12T00:00:00Z"));
        cardRepository.save(utf8Card);

        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "et")
                        .param("gameId", "runtime-et-utf8")
                        .param("topic", "Utf8Topic"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.question").value("Milline s\u00f5na sisaldab t\u00e4hti \u00f5\u00e4\u00f6\u00fc?"))
                .andExpect(jsonPath("$.options[0]").value("\u00d5\u00e4\u00f6\u00fc"))
                .andExpect(jsonPath("$.language").value("et"));
    }

    @Test
    void topicsEndpointIncludesPlayableEstonianTopics() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].topic").value(hasItem("Science")))
                .andExpect(jsonPath("$[*].topic").value(hasItem("History")));
    }
}
