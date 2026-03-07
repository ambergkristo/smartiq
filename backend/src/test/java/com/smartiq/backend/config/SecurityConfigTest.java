package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    void keepsActuatorHealthAccessible() throws Exception {
        MvcResult result = mockMvc.perform(get("/actuator/health"))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isIn(200, 503);
        assertThat(result.getResponse().getContentAsString()).contains("\"status\"");
    }

    @Test
    void keepsMeRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsMeTenantSettingsRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me/tenant-settings"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsMeTenantBrandingRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me/tenant-branding"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsMeTenantSubscriptionRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me/tenant-subscription"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsMeTenantCapabilitiesRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me/tenant-capabilities"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsMeTenantAuditEventsRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me/tenant-audit-events"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsMeTenantUsageSummaryRouteAccessibleToAuthContextLayer() throws Exception {
        mockMvc.perform(get("/api/me/tenant-usage-summary"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsOnboardingBootstrapRouteAccessible() throws Exception {
        mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsAuthRequestLinkRouteAccessible() throws Exception {
        mockMvc.perform(post("/api/auth/request-link")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsBillingWebhookRouteAccessible() throws Exception {
        mockMvc.perform(post("/api/billing/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void allowsWebsocketRouteToReachHandshakeLayer() throws Exception {
        mockMvc.perform(get("/ws/rooms/ABC123"))
                .andExpect(status().isBadRequest());
    }
}
