package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.auth.RuntimeAuthTokenService;
import com.smartiq.backend.shared.RuntimeLimits;
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
        "smartiq.auth.context.jwt-secret=test-runtime-auth-secret",
        "smartiq.auth.context.magic-link-echo-enabled=true",
        "smartiq.billing.provider=test-billing",
        "smartiq.billing.checkout-base-url=https://billing.smartiq.test/checkout",
        "smartiq.billing.success-return-url=https://app.smartiq.test/billing/success",
        "smartiq.billing.cancel-return-url=https://app.smartiq.test/billing/cancel",
        "smartiq.billing.webhook-signing-secret=test-billing-webhook-secret",
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

    @Autowired
    private RuntimeAuthTokenService runtimeAuthTokenService;

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

        mockMvc.perform(get("/api/me")
                        .header("Authorization", unsignedBearerToken("prod-owner@acme.test", tenantId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));

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

        mockMvc.perform(get("/api/me/tenant-capabilities")
                        .header("Authorization", bearerToken("prod-owner@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.planTier").value("pro_host"))
                .andExpect(jsonPath("$.maxHostedPlayers").value(RuntimeLimits.MAX_PLAYERS_PER_ROOM))
                .andExpect(jsonPath("$.analyticsHistoryEnabled").value(true));
    }

    @Test
    void onboardingBootstrapIssuesBearerTokenUsableInProdProfile() throws Exception {
        String payload = """
                {
                  "workspaceName": "Prod Bootstrap Quiz",
                  "ownerEmail": "prod-bootstrap@acme.test",
                  "ownerDisplayName": "Prod Bootstrap Owner"
                }
                """;

        String responseBody = mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenant.name").value("Prod Bootstrap Quiz"))
                .andExpect(jsonPath("$.runtimeAuth.userEmail").value("prod-bootstrap@acme.test"))
                .andExpect(jsonPath("$.runtimeAuth.bearerToken").isString())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String tenantId = objectMapper.readTree(responseBody).path("tenant").path("tenantId").asText();
        String bearerToken = objectMapper.readTree(responseBody).path("runtimeAuth").path("bearerToken").asText();

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("prod-bootstrap@acme.test"))
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId))
                .andExpect(jsonPath("$.selectedRole").value("owner"));
    }

    @Test
    void allowsCheckoutInitiationWithBearerTokenInProdProfile() throws Exception {
        String onboardingPayload = """
                {
                  "workspaceName": "Prod Checkout Quiz",
                  "ownerEmail": "prod-checkout@acme.test",
                  "ownerDisplayName": "Prod Checkout Owner"
                }
                """;
        String onboardingResponse = mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(onboardingPayload))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String bearerToken = objectMapper.readTree(onboardingResponse).path("runtimeAuth").path("bearerToken").asText();

        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "planCode": "pilot-monthly",
                                  "billingCycle": "monthly"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.billingCycle").value("monthly"))
                .andExpect(jsonPath("$.checkoutSessionId").isNotEmpty())
                .andExpect(jsonPath("$.checkoutUrl", org.hamcrest.Matchers.containsString("provider=test-billing")))
                .andExpect(jsonPath("$.checkoutUrl", org.hamcrest.Matchers.containsString("success_url=https://app.smartiq.test/billing/success")))
                .andExpect(jsonPath("$.checkoutUrl", org.hamcrest.Matchers.containsString("cancel_url=https://app.smartiq.test/billing/cancel")))
                .andExpect(jsonPath("$.status").value("initiated"));
    }

    @Test
    void supportsRequestLinkAndCompleteAuthFlowInProdProfile() throws Exception {
        String tenantId = createTenant("prod-signin", "Prod Signin");
        addMember(tenantId, "prod-signin@acme.test", "Prod Signin", "owner");

        String requestLinkResponse = mockMvc.perform(post("/api/auth/request-link")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "prod-signin@acme.test",
                                  "tenantId": "%s"
                                }
                                """.formatted(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.challengeToken").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String challengeToken = objectMapper.readTree(requestLinkResponse).path("challengeToken").asText();

        String completeResponse = mockMvc.perform(post("/api/auth/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "challengeToken": "%s"
                                }
                                """.formatted(challengeToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runtimeAuth.tenantId").value(tenantId))
                .andExpect(jsonPath("$.runtimeAuth.bearerToken").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String bearerToken = objectMapper.readTree(completeResponse).path("runtimeAuth").path("bearerToken").asText();
        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId));
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
        return runtimeAuthTokenService.issueBearerToken(email, java.util.UUID.fromString(tenantId));
    }

    private String unsignedBearerToken(String email, String tenantId) throws Exception {
        Map<String, Object> header = Map.of("alg", "none", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", email);
        payload.put("tenant_id", tenantId);
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String encodedHeader = encoder.encodeToString(objectMapper.writeValueAsBytes(header));
        String encodedPayload = encoder.encodeToString(objectMapper.writeValueAsBytes(payload));
        return "Bearer " + encodedHeader + "." + encodedPayload + ".";
    }
}

