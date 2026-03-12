package com.smartiq.backend.card;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=true",
        "smartiq.import.path=classpath:data/runtime/cards.et.json",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.game.session-store=memory",
        "spring.flyway.placeholders.seed_core_enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_prod_et_enablement_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
@ActiveProfiles("prod")
class ProdProfileEstonianLanguageEnablementTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NextRandomCardService nextRandomCardService;

    @Test
    void prodProfileKeepsEstonianEnabledByDefault() {
        assertThat(nextRandomCardService.isLanguageEnabled("et")).isTrue();
    }

    @Test
    void nextRandomAllowsEstonianUnderProdProfile() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("language", "et")
                        .param("gameId", "prod-et-1")
                        .param("topic", "Science"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("et"))
                .andExpect(jsonPath("$.topic").value("Science"));
    }

    @Test
    void gameSessionCreationAllowsEstonianUnderProdProfile() throws Exception {
        mockMvc.perform(post("/api/game")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "players", List.of("Alice", "Bob"),
                                "language", "et",
                                "topic", "Science",
                                "winCondition", 30
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.boardState.language").value("et"))
                .andExpect(jsonPath("$.snapshot.boardState.topic").value("Science"))
                .andExpect(jsonPath("$.snapshot.roundState.phase").value("CHOOSING"));
    }
}
