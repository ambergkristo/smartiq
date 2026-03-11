package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

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
    void topicsEndpointIncludesPlayableEstonianTopics() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].topic").value(hasItem("Science")))
                .andExpect(jsonPath("$[*].topic").value(hasItem("History")));
    }
}
