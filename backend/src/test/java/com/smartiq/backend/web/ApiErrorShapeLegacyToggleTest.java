package com.smartiq.backend.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.api.errors.legacy-shape-enabled=true",
        "spring.datasource.url=jdbc:h2:mem:smartiq_legacy_error_shape_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class ApiErrorShapeLegacyToggleTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsLegacyShapeWhenToggleEnabled() throws Exception {
        mockMvc.perform(get("/api/cards/nextRandom")
                        .param("gameId", "legacy-shape-test"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.code").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.reason").doesNotExist())
                .andExpect(jsonPath("$.path").doesNotExist());
    }
}
