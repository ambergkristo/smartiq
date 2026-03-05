package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
        "spring.datasource.url=jdbc:h2:mem:smartiq_tenant_me_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.placeholders.seed_core_enabled=false"
})
@AutoConfigureMockMvc
class TenantMeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void returnsMembershipContextAndSelectedTenantRole() throws Exception {
        String tenantA = createTenant("acme-learning", "Acme Learning");
        String tenantB = createTenant("northwind-training", "Northwind Training");

        addMember(tenantA, "owner-jwt@acme.test", "Acme Owner", "owner");
        addMember(tenantB, "owner-jwt@acme.test", "Acme Owner", "viewer");
        updateSettings(tenantB, """
                {
                  "settings": {
                    "schemaVersion": 1,
                    "theme": "ocean",
                    "game": {
                      "maxPlayers": 20
                    }
                  }
                }
                """);
        updateBranding(tenantB, """
                {
                  "appName": "Northwind Quiz",
                  "logoUrl": "https://cdn.example.com/northwind.svg",
                  "primaryColor": "#223344",
                  "secondaryColor": "#556677"
                }
                """);
        updateSubscription(tenantB, """
                {
                  "planCode": "pilot-monthly",
                  "status": "trialing",
                  "billingCycle": "monthly"
                }
                """);

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("owner-jwt@acme.test", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("owner-jwt@acme.test"))
                .andExpect(jsonPath("$.memberships.length()").value(2));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("owner-jwt@acme.test", tenantB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectedTenantId").value(tenantB))
                .andExpect(jsonPath("$.selectedRole").value("viewer"));

        mockMvc.perform(get("/api/me/tenant-settings")
                        .header("Authorization", bearerToken("owner-jwt@acme.test", tenantB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantB))
                .andExpect(jsonPath("$.settings.schemaVersion").value(1))
                .andExpect(jsonPath("$.settings.theme").value("ocean"))
                .andExpect(jsonPath("$.settings.game.maxPlayers").value(20));

        mockMvc.perform(get("/api/me/tenant-branding")
                        .header("Authorization", bearerToken("owner-jwt@acme.test", tenantB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantB))
                .andExpect(jsonPath("$.branding.appName").value("Northwind Quiz"))
                .andExpect(jsonPath("$.branding.logoUrl").value("https://cdn.example.com/northwind.svg"))
                .andExpect(jsonPath("$.branding.primaryColor").value("#223344"));

        mockMvc.perform(get("/api/me/tenant-subscription")
                        .header("Authorization", bearerToken("owner-jwt@acme.test", tenantB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantB))
                .andExpect(jsonPath("$.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.status").value("trialing"))
                .andExpect(jsonPath("$.billingCycle").value("monthly"));
    }

    @Test
    void rejectsMissingOrInvalidAuthContext() throws Exception {
        String tenantId = createTenant("acme", "Acme");
        addMember(tenantId, "solo-jwt@acme.test", "Acme Solo", "owner");

        mockMvc.perform(get("/api/me"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("solo-jwt@acme.test", UUID.randomUUID().toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("missing@acme.test", null)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));

        mockMvc.perform(get("/api/me/tenant-settings")
                        .header("Authorization", bearerToken("solo-jwt@acme.test", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));

        mockMvc.perform(get("/api/me/tenant-branding")
                        .header("Authorization", bearerToken("solo-jwt@acme.test", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));

        mockMvc.perform(get("/api/me/tenant-subscription")
                        .header("Authorization", bearerToken("solo-jwt@acme.test", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));
    }

    @Test
    void keepsHeaderFallbackWorkingInDefaultProfile() throws Exception {
        String tenantId = createTenant("fallback-acme", "Fallback Acme");
        addMember(tenantId, "fallback@acme.test", "Fallback User", "owner");

        mockMvc.perform(get("/api/me")
                        .header("X-SmartIQ-User-Email", "fallback@acme.test")
                        .header("X-SmartIQ-Tenant-Id", tenantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("fallback@acme.test"))
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId))
                .andExpect(jsonPath("$.selectedRole").value("owner"));
    }

    @Test
    void deniesMeAccessAfterMembershipDeletion() throws Exception {
        String tenantId = createTenant("offboard-acme", "Offboard Acme");
        addMember(tenantId, "offboard@acme.test", "Offboard User", "owner");
        addMember(tenantId, "backup-owner@acme.test", "Backup Owner", "owner");

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("offboard@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId));

        String membershipId = findMembershipIdByEmail(tenantId, "offboard@acme.test");

        mockMvc.perform(delete("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("offboard@acme.test", tenantId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBERSHIP_NOT_FOUND"));

        mockMvc.perform(get("/api/me/tenant-settings")
                        .header("Authorization", bearerToken("offboard@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));
    }

    @Test
    void deniesTenantRuntimeAccessWhenMembershipSuspended() throws Exception {
        String tenantId = createTenant("suspend-member-acme", "Suspend Member Acme");
        addMember(tenantId, "member-suspended@acme.test", "Suspended Member", "owner");
        addMember(tenantId, "backup-owner@acme.test", "Backup Owner", "owner");

        String membershipId = findMembershipIdByEmail(tenantId, "member-suspended@acme.test");
        String suspendPayload = """
                {
                  "status": "suspended"
                }
                """;
        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(suspendPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("member-suspended@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));

        mockMvc.perform(get("/api/me/tenant-settings")
                        .header("Authorization", bearerToken("member-suspended@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));
    }

    @Test
    void deniesTenantRuntimeAccessWhenTenantSuspended() throws Exception {
        String tenantId = createTenant("suspend-tenant-acme", "Suspend Tenant Acme");
        addMember(tenantId, "tenant-suspended@acme.test", "Tenant Suspended User", "owner");
        String suspendTenantPayload = """
                {
                  "status": "suspended"
                }
                """;
        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/status", tenantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(suspendTenantPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken("tenant-suspended@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));

        mockMvc.perform(get("/api/me/tenant-branding")
                        .header("Authorization", bearerToken("tenant-suspended@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));
    }

    private String createTenant(String slug, String name) throws Exception {
        String payload = """
                {
                  "slug": "%s",
                  "name": "%s"
                }
                """.formatted(slug, name);

        String responseBody = mockMvc.perform(post("/internal/wl/tenants")
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private void updateSettings(String tenantId, String payload) throws Exception {
        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/settings", tenantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private void updateBranding(String tenantId, String payload) throws Exception {
        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/branding", tenantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private void updateSubscription(String tenantId, String payload) throws Exception {
        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private String findMembershipIdByEmail(String tenantId, String email) throws Exception {
        String membershipsBody = mockMvc.perform(get("/internal/wl/tenants/{tenantId}/members", tenantId))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode memberships = objectMapper.readTree(membershipsBody);
        for (JsonNode membership : memberships) {
            if (email.equalsIgnoreCase(membership.path("email").asText())) {
                return membership.path("membershipId").asText();
            }
        }
        throw new IllegalStateException("membership not found for email: " + email);
    }

    private String bearerToken(String email, String tenantId) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", email);
        if (tenantId != null) {
            payload.put("tenant_id", tenantId);
        }
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
