package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.rate-limit.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_security_config_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void deniesUnknownRouteByDefault() throws Exception {
        mockMvc.perform(get("/not-allowlisted"))
                .andExpect(status().isForbidden());
    }

    @Test
    void keepsPublicApiRouteAccessible() throws Exception {
        mockMvc.perform(get("/api/topics"))
                .andExpect(status().isOk());
    }

    @Test
    void allowsWebsocketRouteToReachHandshakeLayer() throws Exception {
        mockMvc.perform(get("/ws/rooms/ABC123"))
                .andExpect(status().isBadRequest());
    }
}
