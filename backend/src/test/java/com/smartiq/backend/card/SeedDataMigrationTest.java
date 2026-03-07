package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_seed_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class SeedDataMigrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void topicsEndpointReturnsSeededTopics() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(6)))
                .andExpect(jsonPath("$[*].topic").value(hasItem("History")))
                .andExpect(jsonPath("$[?(@.topic=='History')].count").value(hasItem(60)));
    }

    @Test
    void nextRandomServesSeededFallbackCards() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "seed-fallback-1")
                        .param("topic", "History"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("History"))
                .andExpect(jsonPath("$.language").value("en"))
                .andExpect(jsonPath("$.source").value("flyway-seed-core"))
                .andExpect(jsonPath("$.options.length()").value(10));
    }

    @Test
    void seededFallbackDeckAvoidsImmediateTopicAndCategoryRepeats() throws Exception {
        MvcResult first = mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "seed-fallback-global"))
                .andExpect(status().isOk())
                .andReturn();

        MvcResult second = mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "en")
                        .param("gameId", "seed-fallback-global"))
                .andExpect(status().isOk())
                .andReturn();

        String firstTopic = JsonPath.read(first.getResponse().getContentAsString(), "$.topic");
        String secondTopic = JsonPath.read(second.getResponse().getContentAsString(), "$.topic");
        String firstCategory = JsonPath.read(first.getResponse().getContentAsString(), "$.category");
        String secondCategory = JsonPath.read(second.getResponse().getContentAsString(), "$.category");

        assertThat(secondTopic).isNotEqualTo(firstTopic);
        assertThat(secondCategory).isNotEqualTo(firstCategory);
    }
}
