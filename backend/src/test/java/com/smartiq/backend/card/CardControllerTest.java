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
import static org.hamcrest.Matchers.hasItem;

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
        science.setCategory("OPEN");
        science.setLanguage("en");
        science.setQuestion("What planet is known as the Red Planet?");
        science.setOptions(List.of("Mars", "Earth", "Venus", "Jupiter", "Saturn", "Uranus", "Neptune", "Mercury", "Pluto", "Moon"));
        science.setCorrectIndex(0);
        science.setDifficulty("2");
        science.setSource("smartiq-v2");
        science.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(science);

        Card math = new Card();
        math.setId("math-1");
        math.setTopic("Math");
        math.setSubtopic("Addition");
        math.setCategory("OPEN");
        math.setLanguage("en");
        math.setQuestion("What is 2 + 2?");
        math.setOptions(List.of("4", "3", "5", "6", "7", "8", "9", "10", "11", "12"));
        math.setCorrectIndex(0);
        math.setDifficulty("2");
        math.setSource("smartiq-v2");
        math.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(math);

        Card math2 = new Card();
        math2.setId("math-2");
        math2.setTopic("Math");
        math2.setSubtopic("Addition");
        math2.setCategory("OPEN");
        math2.setLanguage("en");
        math2.setQuestion("What is 3 + 3?");
        math2.setOptions(List.of("6", "5", "4", "7", "8", "9", "10", "11", "12", "13"));
        math2.setCorrectIndex(0);
        math2.setDifficulty("2");
        math2.setSource("smartiq-v2");
        math2.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(math2);

        Card mathEasy = new Card();
        mathEasy.setId("math-easy-1");
        mathEasy.setTopic("Math");
        mathEasy.setSubtopic("Addition");
        mathEasy.setCategory("OPEN");
        mathEasy.setLanguage("en");
        mathEasy.setQuestion("What is 1 + 1?");
        mathEasy.setOptions(List.of("2", "1", "3", "4", "5", "6", "7", "8", "9", "10"));
        mathEasy.setCorrectIndex(0);
        mathEasy.setDifficulty("1");
        mathEasy.setSource("smartiq-v2");
        mathEasy.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(mathEasy);

        Card singleV2 = new Card();
        singleV2.setId("single-v2-1");
        singleV2.setTopic("SingleV2");
        singleV2.setSubtopic("Validation");
        singleV2.setCategory("NUMBER");
        singleV2.setLanguage("en");
        singleV2.setQuestion("Single correct answer card");
        singleV2.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        singleV2.setCorrectIndex(3);
        singleV2.setDifficulty("2");
        singleV2.setSource("smartiq-v2");
        singleV2.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(singleV2);

        Card multiV2 = new Card();
        multiV2.setId("multi-v2-1");
        multiV2.setTopic("MultiV2");
        multiV2.setSubtopic("Validation");
        multiV2.setCategory("TRUE_FALSE");
        multiV2.setLanguage("en");
        multiV2.setQuestion("Multi correct answer card");
        multiV2.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        multiV2.setCorrectIndex(null);
        multiV2.setCorrectFlags("true,false,true,false,false,false,false,false,false,false");
        multiV2.setDifficulty("2");
        multiV2.setSource("smartiq-v2");
        multiV2.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(multiV2);

        Card brokenV2 = new Card();
        brokenV2.setId("broken-v2-1");
        brokenV2.setTopic("BrokenV2");
        brokenV2.setSubtopic("Validation");
        brokenV2.setCategory("OPEN");
        brokenV2.setLanguage("en");
        brokenV2.setQuestion("Broken correctness metadata card");
        brokenV2.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        brokenV2.setCorrectIndex(null);
        brokenV2.setCorrectFlags(null);
        brokenV2.setDifficulty("2");
        brokenV2.setSource("smartiq-v2");
        brokenV2.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(brokenV2);

        Card legacyFactory = new Card();
        legacyFactory.setId("legacy-factory-1");
        legacyFactory.setTopic("LegacyOnly");
        legacyFactory.setSubtopic("OPEN");
        legacyFactory.setCategory("OPEN");
        legacyFactory.setLanguage("en");
        legacyFactory.setQuestion("Legacy factory card should be filtered");
        legacyFactory.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        legacyFactory.setCorrectIndex(0);
        legacyFactory.setDifficulty("2");
        legacyFactory.setSource("smartiq-factory");
        legacyFactory.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(legacyFactory);

        Card mixedAllowed = new Card();
        mixedAllowed.setId("legacy-mixed-allowed-1");
        mixedAllowed.setTopic("LegacyMixed");
        mixedAllowed.setSubtopic("OPEN");
        mixedAllowed.setCategory("OPEN");
        mixedAllowed.setLanguage("en");
        mixedAllowed.setQuestion("Allowed source card in mixed pool");
        mixedAllowed.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        mixedAllowed.setCorrectIndex(0);
        mixedAllowed.setDifficulty("2");
        mixedAllowed.setSource("smartiq-v2");
        mixedAllowed.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(mixedAllowed);

        Card mixedDeprecated = new Card();
        mixedDeprecated.setId("legacy-mixed-deprecated-1");
        mixedDeprecated.setTopic("LegacyMixed");
        mixedDeprecated.setSubtopic("OPEN");
        mixedDeprecated.setCategory("OPEN");
        mixedDeprecated.setLanguage("en");
        mixedDeprecated.setQuestion("Deprecated source card in mixed pool");
        mixedDeprecated.setOptions(List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"));
        mixedDeprecated.setCorrectIndex(0);
        mixedDeprecated.setDifficulty("2");
        mixedDeprecated.setSource("smartiq-factory");
        mixedDeprecated.setCreatedAt(Instant.parse("2026-02-17T00:00:00Z"));
        cardRepository.save(mixedDeprecated);
    }

    @Test
    void returnsTopicCounts() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.topic=='Math')].count", hasItem(3)))
                .andExpect(jsonPath("$[?(@.topic=='Science')].count", hasItem(1)));
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
    void returnsNextRandomCardForGameIdAndLanguage() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "game-1")
                        .param("topic", "Math"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cardId").exists())
                .andExpect(jsonPath("$.language").value("en"))
                .andExpect(jsonPath("$.source").value("smartiq-v2"))
                .andExpect(jsonPath("$.correct").exists())
                .andExpect(jsonPath("$.options.length()").value(10));
    }

    @Test
    void returnsBadRequestWhenNextRandomGameIdMissing() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returnsNotFoundWhenOnlyDeprecatedSourcesMatchNextRandomPool() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "game-legacy")
                        .param("topic", "LegacyOnly"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("No cards available for language=en, topic=LegacyOnly"));
    }

    @Test
    void nextRandomExcludesDeprecatedSourcesWhenAllowedAlternativesExist() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "game-legacy-mixed")
                        .param("topic", "LegacyMixed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cardId").value("legacy-mixed-allowed-1"))
                .andExpect(jsonPath("$.source").value("smartiq-v2"));
    }

    @Test
    void fallsBackToEnglishWhenRequestedLanguagePoolIsEmpty() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "et")
                        .param("gameId", "game-empty")
                        .param("topic", "Math"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("en"));
    }

    @Test
    void returnsNextCardForTopicDifficultySession() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "Math")
                        .param("difficulty", "2")
                        .param("sessionId", "test-session")
                        .param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Math"))
                .andExpect(jsonPath("$.difficulty").value("2"))
                .andExpect(jsonPath("$.cardId").exists());
    }

    @Test
    void avoidsDuplicateCardsForSameSession() throws Exception {
        MvcResult first = mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "Math")
                        .param("difficulty", "2")
                        .param("sessionId", "session-1")
                        .param("lang", "en"))
                .andExpect(status().isOk())
                .andReturn();

        String firstId = JsonPath.read(first.getResponse().getContentAsString(), "$.id");

        MvcResult second = mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "Math")
                        .param("difficulty", "2")
                        .param("sessionId", "session-1")
                        .param("lang", "en"))
                .andExpect(status().isOk())
                .andReturn();

        String secondId = JsonPath.read(second.getResponse().getContentAsString(), "$.id");
        org.junit.jupiter.api.Assertions.assertNotEquals(firstId, secondId);
    }

    @Test
    void returnsDefaultDifficultyAndLanguageWhenMissing() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "Math")
                        .param("sessionId", "session-default"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Math"))
                .andExpect(jsonPath("$.difficulty").value("1"))
                .andExpect(jsonPath("$.language").value("en"));
    }

    @Test
    void returnsV2CardWithNumericDifficultyAndOptionObjects() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "SingleV2")
                        .param("difficulty", "2")
                        .param("sessionId", "single-v2-session")
                        .param("lang", "en")
                        .param("v", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.difficulty").value(2))
                .andExpect(jsonPath("$.options.length()").value(10))
                .andExpect(jsonPath("$.options[0].id").value(0))
                .andExpect(jsonPath("$.options[0].text").value("A"));
    }

    @Test
    void returnsMultiCorrectMetadataInV2Response() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "MultiV2")
                        .param("difficulty", "2")
                        .param("sessionId", "multi-v2-session")
                        .param("lang", "en")
                        .param("v", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.multiCorrect").value(true))
                .andExpect(jsonPath("$.correctIndex").isEmpty())
                .andExpect(jsonPath("$.correctIndexes.length()").value(2))
                .andExpect(jsonPath("$.correctIndexes[0]").value(0))
                .andExpect(jsonPath("$.correctIndexes[1]").value(2));
    }

    @Test
    void returnsSingleCorrectMetadataInV2Response() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "SingleV2")
                        .param("difficulty", "2")
                        .param("sessionId", "single-v2-metadata-session")
                        .param("lang", "en")
                        .param("v", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.multiCorrect").value(false))
                .andExpect(jsonPath("$.correctIndex").value(3))
                .andExpect(jsonPath("$.correctIndexes.length()").value(1))
                .andExpect(jsonPath("$.correctIndexes[0]").value(3));
    }

    @Test
    void returnsInternalServerErrorForInvalidCorrectnessMetadataInV2() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "BrokenV2")
                        .param("difficulty", "2")
                        .param("sessionId", "broken-v2-session")
                        .param("lang", "en")
                        .param("v", "2"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void returnsBadRequestWhenTopicMissing() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("difficulty", "2")
                        .param("sessionId", "missing-topic"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("topicId is required"));
    }

    @Test
    void returnsNotFoundWhenNoCardsForTopicFilter() throws Exception {
        mockMvc.perform(get("/api/cards/next")
                        .param("topicId", "Unknown")
                        .param("difficulty", "1")
                        .param("sessionId", "missing-cards")
                        .param("lang", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void versionEndpointIsAvailable() throws Exception {
        mockMvc.perform(get("/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commitSha").exists())
                .andExpect(jsonPath("$.buildTime").exists());
    }

    @Test
    void poolStatsEndpointIsAvailable() throws Exception {
        mockMvc.perform(get("/internal/pool-stats"))
                .andExpect(status().isOk());
    }

    @Test
    void prometheusEndpointIsAvailable() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk());
    }
}
