package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.auth.RuntimeAuthTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
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
        "smartiq.billing.provider=test-billing",
        "smartiq.billing.checkout-base-url=https://billing.smartiq.test/checkout",
        "smartiq.billing.success-return-url=https://app.smartiq.test/billing/success",
        "smartiq.billing.cancel-return-url=https://app.smartiq.test/billing/cancel",
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

    @Autowired
    private RuntimeAuthTokenService runtimeAuthTokenService;

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

        mockMvc.perform(get("/api/me/tenant-capabilities")
                        .header("Authorization", bearerToken("owner-jwt@acme.test", tenantB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantB))
                .andExpect(jsonPath("$.planTier").value("trial"))
                .andExpect(jsonPath("$.maxHostedPlayers").value(4))
                .andExpect(jsonPath("$.analyticsHistoryEnabled").value(false));
    }

    @Test
    void bootstrapsOnboardingWorkspaceAndRuntimeContext() throws Exception {
        String payload = """
                {
                  "workspaceName": "Launch Club Quiz",
                  "ownerEmail": "owner@launchclub.test",
                  "ownerDisplayName": "Launch Owner"
                }
                """;

        String responseBody = mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenant.name").value("Launch Club Quiz"))
                .andExpect(jsonPath("$.member.email").value("owner@launchclub.test"))
                .andExpect(jsonPath("$.member.role").value("owner"))
                .andExpect(jsonPath("$.me.email").value("owner@launchclub.test"))
                .andExpect(jsonPath("$.runtimeAuth.userEmail").value("owner@launchclub.test"))
                .andExpect(jsonPath("$.runtimeAuth.bearerToken").isString())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode onboarding = objectMapper.readTree(responseBody);
        String tenantId = onboarding.path("tenant").path("tenantId").asText();
        String bearerToken = onboarding.path("runtimeAuth").path("bearerToken").asText();

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("owner@launchclub.test"))
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId))
                .andExpect(jsonPath("$.selectedRole").value("owner"))
                .andExpect(jsonPath("$.memberships.length()").value(1));
    }

    @Test
    void supportsCheckoutAndBillingWebhookSubscriptionSyncWithIdempotency() throws Exception {
        String onboardingPayload = """
                {
                  "workspaceName": "Billing Club Quiz",
                  "ownerEmail": "billing-owner@launchclub.test",
                  "ownerDisplayName": "Billing Owner"
                }
                """;
        String onboardingResponse = mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(onboardingPayload))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode onboarding = objectMapper.readTree(onboardingResponse);
        String tenantId = onboarding.path("tenant").path("tenantId").asText();
        String bearerToken = onboarding.path("runtimeAuth").path("bearerToken").asText();

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
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.billingCycle").value("monthly"))
                .andExpect(jsonPath("$.checkoutSessionId").isNotEmpty())
                .andExpect(jsonPath("$.checkoutUrl", org.hamcrest.Matchers.containsString("provider=test-billing")))
                .andExpect(jsonPath("$.checkoutUrl", org.hamcrest.Matchers.containsString("success_url=https://app.smartiq.test/billing/success")))
                .andExpect(jsonPath("$.checkoutUrl", org.hamcrest.Matchers.containsString("cancel_url=https://app.smartiq.test/billing/cancel")))
                .andExpect(jsonPath("$.status").value("initiated"));

        String webhookPayload = """
                {
                  "eventId": "evt_billing_001",
                  "tenantId": "%s",
                  "eventType": "subscription.activated",
                  "occurredAt": "2030-01-01T00:00:00Z",
                  "planCode": "pilot-monthly",
                  "status": "active",
                  "billingCycle": "monthly",
                  "currentPeriodStartsAt": "2030-01-01T00:00:00Z",
                  "currentPeriodEndsAt": "2030-02-01T00:00:00Z"
                }
                """.formatted(tenantId);
        mockMvc.perform(post("/api/billing/webhook")
                        .header("X-SmartIQ-Billing-Signature", billingWebhookSignature(webhookPayload))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventStatus").value("processed"))
                .andExpect(jsonPath("$.applied").value(true))
                .andExpect(jsonPath("$.duplicate").value(false))
                .andExpect(jsonPath("$.stale").value(false))
                .andExpect(jsonPath("$.subscription.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.subscription.status").value("active"));

        mockMvc.perform(post("/api/billing/webhook")
                        .header("X-SmartIQ-Billing-Signature", billingWebhookSignature(webhookPayload))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventStatus").value("ignored_duplicate"))
                .andExpect(jsonPath("$.applied").value(false))
                .andExpect(jsonPath("$.duplicate").value(true))
                .andExpect(jsonPath("$.stale").value(false));

        String staleWebhookPayload = """
                {
                  "eventId": "evt_billing_000",
                  "tenantId": "%s",
                  "eventType": "subscription.updated",
                  "occurredAt": "2029-12-15T00:00:00Z",
                  "planCode": "starter-monthly",
                  "status": "past_due",
                  "billingCycle": "monthly",
                  "currentPeriodStartsAt": "2029-12-01T00:00:00Z",
                  "currentPeriodEndsAt": "2030-01-01T00:00:00Z"
                }
                """.formatted(tenantId);
        mockMvc.perform(post("/api/billing/webhook")
                        .header("X-SmartIQ-Billing-Signature", billingWebhookSignature(staleWebhookPayload))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staleWebhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventStatus").value("ignored_stale"))
                .andExpect(jsonPath("$.applied").value(false))
                .andExpect(jsonPath("$.duplicate").value(false))
                .andExpect(jsonPath("$.stale").value(true))
                .andExpect(jsonPath("$.subscription.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.subscription.status").value("active"));

        mockMvc.perform(get("/api/me/tenant-subscription")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.billingCycle").value("monthly"));
    }

    @Test
    void exposesTenantAuditAndUsageSummaryToRuntimeMember() throws Exception {
        String tenantId = createTenant("runtime-insights", "Runtime Insights");
        addMember(tenantId, "insights@acme.test", "Insights Host", "owner");
        updateSubscription(tenantId, """
                {
                  "planCode": "pilot-monthly",
                  "status": "active",
                  "billingCycle": "monthly",
                  "currentPeriodStartsAt": "2030-01-01T00:00:00Z",
                  "currentPeriodEndsAt": "2030-02-01T00:00:00Z"
                }
                """);

        String roomResponse = mockMvc.perform(post("/api/rooms")
                        .header("Authorization", bearerToken("insights@acme.test", tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Insights Host"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String roomCode = objectMapper.readTree(roomResponse).path("roomCode").asText();

        mockMvc.perform(get("/api/me/tenant-audit-events?limit=5")
                        .header("Authorization", bearerToken("insights@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("HOST_ROOM_CREATED"))
                .andExpect(jsonPath("$[0].entityId").value(roomCode));

        mockMvc.perform(get("/api/me/tenant-capabilities")
                        .header("Authorization", bearerToken("insights@acme.test", tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planTier").value("pro_host"))
                .andExpect(jsonPath("$.maxHostedPlayers").value(10))
                .andExpect(jsonPath("$.analyticsHistoryEnabled").value(true));

        mockMvc.perform(get("/api/me/tenant-usage-summary?eventType=game.round.completed")
                        .header("Authorization", bearerToken("insights@acme.test", tenantId)))
                .andExpect(status().isOk());
    }

    @Test
    void blocksTenantAnalyticsReadForTrialPlan() throws Exception {
        String tenantId = createTenant("trial-analytics", "Trial Analytics");
        addMember(tenantId, "trial-analytics@acme.test", "Trial Analytics", "owner");
        updateSubscription(tenantId, """
                {
                  "planCode": "pilot-monthly",
                  "status": "trialing",
                  "billingCycle": "monthly"
                }
                """);

        mockMvc.perform(get("/api/me/tenant-audit-events")
                        .header("Authorization", bearerToken("trial-analytics@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"))
                .andExpect(jsonPath("$.error").value("current plan does not include host analytics/history"));

        mockMvc.perform(get("/api/me/tenant-usage-summary")
                        .header("Authorization", bearerToken("trial-analytics@acme.test", tenantId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"))
                .andExpect(jsonPath("$.error").value("current plan does not include host analytics/history"));
    }

    @Test
    void blocksHostedRuntimeCreationWhenSubscriptionIsPastDue() throws Exception {
        String tenantId = createTenant("past-due-host", "Past Due Host");
        addMember(tenantId, "billing-blocked@acme.test", "Billing Blocked", "owner");
        updateSubscription(tenantId, """
                {
                  "planCode": "pilot-monthly",
                  "status": "past_due",
                  "billingCycle": "monthly"
                }
                """);

        mockMvc.perform(post("/api/rooms")
                        .header("Authorization", bearerToken("billing-blocked@acme.test", tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Billing Blocked"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"))
                .andExpect(jsonPath("$.error").value("subscription status does not allow hosted runtime"));

        mockMvc.perform(post("/api/game")
                        .header("Authorization", bearerToken("billing-blocked@acme.test", tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "players": ["Billing Blocked"],
                                  "language": "en",
                                  "winCondition": 30
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"))
                .andExpect(jsonPath("$.error").value("subscription status does not allow hosted runtime"));
    }

    @Test
    void blocksHostedGameCreationAboveTrialPlayerLimit() throws Exception {
        String tenantId = createTenant("trial-player-cap", "Trial Player Cap");
        addMember(tenantId, "trial-cap@acme.test", "Trial Cap", "owner");
        updateSubscription(tenantId, """
                {
                  "planCode": "pilot-monthly",
                  "status": "trialing",
                  "billingCycle": "monthly"
                }
                """);

        mockMvc.perform(post("/api/game")
                        .header("Authorization", bearerToken("trial-cap@acme.test", tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "players": ["P1", "P2", "P3", "P4", "P5"],
                                  "language": "en",
                                  "winCondition": 30
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"))
                .andExpect(jsonPath("$.error").value("current plan allows up to 4 hosted players"));
    }

    @Test
    void rejectsBillingWebhookWithInvalidSignature() throws Exception {
        String tenantId = createTenant("billing-signature", "Billing Signature");

        String payload = """
                {
                  "eventId": "evt_invalid_signature",
                  "tenantId": "%s",
                  "eventType": "subscription.activated",
                  "occurredAt": "2030-01-01T00:00:00Z",
                  "planCode": "pilot-monthly",
                  "status": "active",
                  "billingCycle": "monthly"
                }
                """.formatted(tenantId);

        mockMvc.perform(post("/api/billing/webhook")
                        .header("X-SmartIQ-Billing-Signature", "sha256=deadbeef")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_BILLING_EVENT"))
                .andExpect(jsonPath("$.error").value("billing webhook signature is invalid"));
    }

    @Test
    void tenantBoundGameAndRoomRejectCrossTenantRuntimeAccess() throws Exception {
        String tenantA = createTenant("host-tenant-a", "Host Tenant A");
        String tenantB = createTenant("host-tenant-b", "Host Tenant B");
        addMember(tenantA, "host-runtime@acme.test", "Host Runtime", "owner");
        addMember(tenantB, "host-runtime@acme.test", "Host Runtime", "owner");

        String roomResponse = mockMvc.perform(post("/api/rooms")
                        .header("Authorization", bearerToken("host-runtime@acme.test", tenantA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Alice"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String roomCode = objectMapper.readTree(roomResponse).path("roomCode").asText();

        mockMvc.perform(post("/api/rooms/{roomCode}/join", roomCode)
                        .header("Authorization", bearerToken("host-runtime@acme.test", tenantB))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Mallory"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"));
    }

    @Test
    void supportsRequestLinkAndCompleteAuthFlow() throws Exception {
        String tenantId = createTenant("signin-acme", "Signin Acme");
        addMember(tenantId, "signin@acme.test", "Signin User", "owner");

        String requestLinkResponse = mockMvc.perform(post("/api/auth/request-link")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "signin@acme.test",
                                  "tenantId": "%s"
                                }
                                """.formatted(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("signin@acme.test"))
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.deliveryMode").value("echo"))
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
                .andExpect(jsonPath("$.runtimeAuth.userEmail").value("signin@acme.test"))
                .andExpect(jsonPath("$.runtimeAuth.tenantId").value(tenantId))
                .andExpect(jsonPath("$.runtimeAuth.bearerToken").isNotEmpty())
                .andExpect(jsonPath("$.me.selectedTenantId").value(tenantId))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String bearerToken = objectMapper.readTree(completeResponse).path("runtimeAuth").path("bearerToken").asText();

        mockMvc.perform(get("/api/me")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("signin@acme.test"))
                .andExpect(jsonPath("$.selectedTenantId").value(tenantId));

        mockMvc.perform(post("/api/auth/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "challengeToken": "%s"
                                }
                                """.formatted(challengeToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AUTH_CONTEXT"));
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

        mockMvc.perform(get("/api/me")
                        .header("Authorization", unsignedBearerToken("solo-jwt@acme.test", tenantId)))
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
        UUID parsedTenantId = tenantId == null ? null : UUID.fromString(tenantId);
        return runtimeAuthTokenService.issueBearerToken(email, parsedTenantId);
    }

    private String unsignedBearerToken(String email, String tenantId) throws Exception {
        Map<String, Object> header = Map.of("alg", "none", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", email);
        if (tenantId != null) {
            payload.put("tenant_id", tenantId);
        }
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String encodedHeader = encoder.encodeToString(objectMapper.writeValueAsBytes(header));
        String encodedPayload = encoder.encodeToString(objectMapper.writeValueAsBytes(payload));
        return "Bearer " + encodedHeader + "." + encodedPayload + ".";
    }

    private String billingWebhookSignature(String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("smartiq-dev-billing-secret-change-me".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(digest.length * 2);
        for (byte value : digest) {
            hex.append(Character.forDigit((value >> 4) & 0xF, 16));
            hex.append(Character.forDigit(value & 0xF, 16));
        }
        return "sha256=" + hex;
    }
}
