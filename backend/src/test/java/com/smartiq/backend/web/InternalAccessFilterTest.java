package com.smartiq.backend.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.bank.block-on-low-bank=false",
        "smartiq.internal-access.enabled=true",
        "smartiq.internal-access.api-key=test-internal-key",
        "spring.flyway.placeholders.seed_core_enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_internal_access_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@ActiveProfiles("prod")
@AutoConfigureMockMvc
class InternalAccessFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void blocksInternalEndpointWithoutApiKeyInProd() throws Exception {
        mockMvc.perform(get("/internal/pool-stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void allowsInternalEndpointWithApiKeyInProd() throws Exception {
        mockMvc.perform(get("/internal/pool-stats").header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk());
    }

    @Test
    void keepsHealthEndpointPublicInProd() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }
}
