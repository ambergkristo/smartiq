package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.import.fail-on-category-threshold=false",
        "smartiq.game.session-store=memory",
        "smartiq.room.session-store=memory",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "smartiq.bank.block-on-low-bank=false",
        "smartiq.internal-access.enabled=true",
        "smartiq.internal-access.api-key=test-internal-key",
        "spring.datasource.url=jdbc:h2:mem:smartiq_tenant_me_prod_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.placeholders.seed_core_enabled=false"
})
@ActiveProfiles("prod")
@AutoConfigureMockMvc
class TenantMeControllerProdAuthContextTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void requiresBearerTokenWhenHeaderFallbackDisabledInProd() throws Exception {
        String tenantId = createTenant("prod-acme", "Prod Acme");
        addMember(tenantId, "prod-owner@acme.test", "Prod Owner", "owner");
        updateSettings(tenantId, """
                {
                  "settings": {
                    "schemaVersion": 1,
                    "theme": "ember"
                  }
                }
                """);
        updateSubscription(tenantId, """
                {
                  "planCode": "enterprise-annual",
                  "status": "active",
                  "billingCycle": "annual"
                }
                """);

        mockMvc.perform(get("/api/me")
                        .header("X-SmartIQ-User-Email", "prod-owner@acme.test"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("prod-owner@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("prod-owner@acme.test"))
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId))
                .andExpect(jsonPath("$.selectedRole").value("owner"));

        mockMvc.perform(get("/api/me/tenant-settings")
                        .header("Authorization", bearerToken("prod-owner@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.settings.schemaVersion").value(1))
                .andExpect(jsonPath("$.settings.theme").value("ember"));

        mockMvc.perform(get("/api/me/tenant-branding")
                        .header("Authorization", bearerToken("prod-owner@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.branding.appName").value("Prod Acme"));

        mockMvc.perform(get("/api/me/tenant-subscription")
                        .header("Authorization", bearerToken("prod-owner@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.planCode").value("enterprise-annual"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.billingCycle").value("annual"));
    }

    private String createTenant(String slug, String name) throws Exception {
        String payload = """
                {
                  "slug": "%s",
                  "name": "%s"
                }
                """.formatted(slug, name);

        String responseBody = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(responseBody).path("tenantId").asText();
    }

    private void addMember(String tenantId, String email, String displayName, String role) throws Exception {
        String payload = """
                {
                  "email": "%s",
                  "displayName": "%s",
                  "role": "%s"
                }
                """.formatted(email, displayName, role);

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/members", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private void updateSettings(String tenantId, String payload) throws Exception {
        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/settings", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private void updateSubscription(String tenantId, String payload) throws Exception {
        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private String bearerToken(String email, String tenantId) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", email);
        payload.put("tenant_id", tenantId);
        return "Bearer " + unsignedJwt(payload);
    }

    private String unsignedJwt(Map<String, Object> payload) throws Exception {
        Map<String, Object> header = Map.of("alg", "none", "typ", "JWT");
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String encodedHeader = encoder.encodeToString(objectMapper.writeValueAsBytes(header));
        String encodedPayload = encoder.encodeToString(objectMapper.writeValueAsBytes(payload));
        return encodedHeader + "." + encodedPayload + ".";
    }
}
