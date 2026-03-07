package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.shared.RuntimeLimits;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
        "smartiq.internal-access.enabled=true",
        "smartiq.internal-access.api-key=test-internal-key",
        "spring.datasource.url=jdbc:h2:mem:smartiq_tenant_admin_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.placeholders.seed_core_enabled=false"
})
@ActiveProfiles("prod")
@AutoConfigureMockMvc
class TenantAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TenantAuditEventRepository tenantAuditEventRepository;

    @Test
    void blocksTenantAdminRoutesWithoutInternalApiKeyInProd() throws Exception {
        mockMvc.perform(get("/internal/wl/tenants"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsEmptyUsageSummaryAndDefaultPilotSummaryForFreshTenant() throws Exception {
        String tenantResponse = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "fresh-tenant-usage",
                                  "name": "Fresh Tenant Usage"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String tenantId = objectMapper.readTree(tenantResponse).path("tenantId").asText();

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-summary", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").doesNotExist());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/pilot-summary", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activated").value(false))
                .andExpect(jsonPath("$.repeatHost").value(false))
                .andExpect(jsonPath("$.paidConverted").value(false))
                .andExpect(jsonPath("$.workspaceBootstraps").value(0))
                .andExpect(jsonPath("$.hostSignIns").value(0))
                .andExpect(jsonPath("$.sessionLaunches").value(0))
                .andExpect(jsonPath("$.completedSessions").value(0))
                .andExpect(jsonPath("$.openSupportCases").value(0))
                .andExpect(jsonPath("$.resolvedSupportCases").value(0));
    }

    @Test
    void updatesTenantStatusAndRejectsUnsupportedStatus() throws Exception {
        String createPayload = """
                {
                  "slug": "status-acme",
                  "name": "Status Acme"
                }
                """;

        String responseBody = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String tenantId = objectMapper.readTree(responseBody).path("tenantId").asText();
        String actorUserId = UUID.randomUUID().toString();

        String suspendPayload = """
                {
                  "status": "suspended"
                }
                """;
        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/status", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .header("X-SmartIQ-Actor-User-Id", actorUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(suspendPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.status").value("suspended"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("suspended"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/audit-events?limit=1", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("TENANT_STATUS_UPDATED"))
                .andExpect(jsonPath("$[0].actorUserId").value(actorUserId));

        String invalidPayload = """
                {
                  "status": "archived"
                }
                """;
        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/status", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/status", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .header("X-SmartIQ-Actor-User-Id", "not-a-uuid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(suspendPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));
    }

    @Test
    void listsTenantsWithStatusAndQueryFilters() throws Exception {
        String tenantAResponse = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "filter-acme-one",
                                  "name": "Filter Acme One"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String tenantA = objectMapper.readTree(tenantAResponse).path("tenantId").asText();

        mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "filter-acme-two",
                                  "name": "Filter Acme Two"
                                }
                                """))
                .andExpect(status().isOk());

        String tenantSuspendedResponse = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "filter-suspended",
                                  "name": "Filter Suspended"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String tenantSuspended = objectMapper.readTree(tenantSuspendedResponse).path("tenantId").asText();

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/status", tenantSuspended)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "suspended"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/internal/wl/tenants?q=filter-acme&status=active")
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].status").value("active"))
                .andExpect(jsonPath("$[1].status").value("active"))
                .andExpect(jsonPath("$[2]").doesNotExist());

        mockMvc.perform(get("/internal/wl/tenants?q=filter-suspended&status=suspended")
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tenantId").value(tenantSuspended))
                .andExpect(jsonPath("$[0].status").value("suspended"));

        mockMvc.perform(get("/internal/wl/tenants?q=filter-acme-one")
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tenantId").value(tenantA));

        mockMvc.perform(get("/internal/wl/tenants?status=archived")
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));
    }

    @Test
    void createsListsAndUpdatesTenantBranding() throws Exception {
        String createPayload = """
                {
                  "slug": "acme-learning",
                  "name": "Acme Learning",
                  "legalEntityName": "Acme Learning OU",
                  "billingEmail": "billing@acme.test"
                }
                """;

        String responseBody = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("acme-learning"))
                .andExpect(jsonPath("$.name").value("Acme Learning"))
                .andExpect(jsonPath("$.branding.appName").value("Acme Learning"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String tenantId = objectMapper.readTree(responseBody).path("tenantId").asText();

        mockMvc.perform(get("/internal/wl/tenants?q=acme-learning")
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("acme-learning"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/settings", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.schemaVersion").value(1))
                .andExpect(jsonPath("$.settings.theme").value("classic"))
                .andExpect(jsonPath("$.settings.game.maxPlayers").value(RuntimeLimits.MAX_PLAYERS_PER_ROOM))
                .andExpect(jsonPath("$.settings.features.leaderboardEnabled").value(false));

        String addMemberPayload = """
                {
                  "email": "owner@acme.test",
                  "displayName": "Acme Owner",
                  "role": "owner"
                }
                """;

        String memberResponseBody = mockMvc.perform(post("/internal/wl/tenants/{tenantId}/members", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addMemberPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.email").value("owner@acme.test"))
                .andExpect(jsonPath("$.role").value("owner"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String membershipId = objectMapper.readTree(memberResponseBody).path("membershipId").asText();

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/members", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tenantId").value(tenantId))
                .andExpect(jsonPath("$[0].email").value("owner@acme.test"));

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/members", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addMemberPayload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_MEMBERSHIP"));

        String lastOwnerUpdatePayload = """
                {
                  "role": "admin"
                }
                """;

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(lastOwnerUpdatePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("LAST_OWNER_PROTECTION"));

        mockMvc.perform(delete("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("LAST_OWNER_PROTECTION"));

        String addSecondOwnerPayload = """
                {
                  "email": "coowner@acme.test",
                  "displayName": "Acme Co-owner",
                  "role": "owner"
                }
                """;

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/members", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addSecondOwnerPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.email").value("coowner@acme.test"))
                .andExpect(jsonPath("$.role").value("owner"));

        String updateMemberPayload = """
                {
                  "role": "admin",
                  "status": "suspended"
                }
                """;

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateMemberPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.membershipId").value(membershipId))
                .andExpect(jsonPath("$.role").value("admin"))
                .andExpect(jsonPath("$.status").value("suspended"));

        String invalidMemberUpdatePayload = """
                {
                  "role": "bad-role"
                }
                """;

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidMemberUpdatePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));

        mockMvc.perform(delete("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/members", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("coowner@acme.test"))
                .andExpect(jsonPath("$[0].role").value("owner"))
                .andExpect(jsonPath("$[1]").doesNotExist());

        mockMvc.perform(delete("/internal/wl/tenants/{tenantId}/members/{membershipId}", tenantId, membershipId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isNotFound());

        String settingsPayload = """
                {
                  "settings": {
                    "schemaVersion": 1,
                    "theme": "ocean",
                    "game": {
                      "roundsPerMatch": 12
                    },
                    "features": {
                      "leaderboardEnabled": true
                    }
                  }
                }
                """;

        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/settings", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(settingsPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.settings.schemaVersion").value(1))
                .andExpect(jsonPath("$.settings.theme").value("ocean"))
                .andExpect(jsonPath("$.settings.game.roundsPerMatch").value(12))
                .andExpect(jsonPath("$.settings.features.leaderboardEnabled").value(true));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/settings", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.schemaVersion").value(1))
                .andExpect(jsonPath("$.settings.game.roundsPerMatch").value(12));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId));

        String subscriptionPayload = """
                {
                  "planCode": "pilot-monthly",
                  "status": "trialing",
                  "billingCycle": "monthly",
                  "trialEndsAt": "2030-01-31T00:00:00Z",
                  "currentPeriodStartsAt": "2030-01-01T00:00:00Z",
                  "currentPeriodEndsAt": "2030-02-01T00:00:00Z"
                }
                """;

        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(subscriptionPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.status").value("trialing"))
                .andExpect(jsonPath("$.billingCycle").value("monthly"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planCode").value("pilot-monthly"))
                .andExpect(jsonPath("$.status").value("trialing"));

        String usagePayload = """
                {
                  "eventType": "game.round.completed",
                  "eventValue": 1,
                  "metadata": {
                    "language": "en",
                    "gameId": "g-1"
                  }
                }
                """;

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(usagePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.eventType").value("game.round.completed"))
                .andExpect(jsonPath("$.eventValue").value(1))
                .andExpect(jsonPath("$.metadata.language").value("en"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("game.round.completed"))
                .andExpect(jsonPath("$[1]").doesNotExist());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-events?eventType=game.round.completed", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("game.round.completed"))
                .andExpect(jsonPath("$[1]").doesNotExist());

        String usagePayloadSecond = """
                {
                  "eventType": "game.round.completed",
                  "eventValue": 2,
                  "eventTime": "2030-01-01T01:00:00Z"
                }
                """;
        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(usagePayloadSecond))
                .andExpect(status().isOk());

        String usagePayloadThird = """
                {
                  "eventType": "session.started",
                  "eventValue": 5,
                  "eventTime": "2030-01-01T02:00:00Z"
                }
                """;
        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(usagePayloadThird))
                .andExpect(status().isOk());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-summary", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("game.round.completed"))
                .andExpect(jsonPath("$[0].totalValue").value(3))
                .andExpect(jsonPath("$[0].eventCount").value(2))
                .andExpect(jsonPath("$[1].eventType").value("session.started"))
                .andExpect(jsonPath("$[1].totalValue").value(5))
                .andExpect(jsonPath("$[1].eventCount").value(1));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-summary?eventType=game.round.completed", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("game.round.completed"))
                .andExpect(jsonPath("$[0].totalValue").value(3))
                .andExpect(jsonPath("$[1]").doesNotExist());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-summary?from=2030-01-01T01:00:00Z&to=2030-01-01T02:00:00Z", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("game.round.completed"))
                .andExpect(jsonPath("$[0].totalValue").value(2))
                .andExpect(jsonPath("$[1].eventType").value("session.started"))
                .andExpect(jsonPath("$[1].totalValue").value(5));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/usage-summary?from=2030-01-02T00:00:00Z&to=2030-01-01T00:00:00Z", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));

        String invalidSettingsPayload = """
                {
                  "settings": {
                    "schemaVersion": 2,
                    "unsupported": "x"
                  }
                }
                """;

        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/settings", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidSettingsPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));

        String invalidSubscriptionPayload = """
                {
                  "planCode": "pilot-monthly",
                  "status": "trialing",
                  "billingCycle": "monthly",
                  "currentPeriodStartsAt": "2030-02-01T00:00:00Z",
                  "currentPeriodEndsAt": "2030-01-01T00:00:00Z"
                }
                """;

        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidSubscriptionPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));

        String invalidUsagePayload = """
                {
                  "eventType": "game.round.completed",
                  "eventValue": -1
                }
                """;

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidUsagePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));

        String brandingPayload = """
                {
                  "appName": "Acme Quiz",
                  "logoUrl": "https://cdn.example.com/logo.svg",
                  "primaryColor": "#112233",
                  "secondaryColor": "#AABBCC"
                }
                """;

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/branding", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(brandingPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branding.appName").value("Acme Quiz"))
                .andExpect(jsonPath("$.branding.primaryColor").value("#112233"))
                .andExpect(jsonPath("$.branding.secondaryColor").value("#AABBCC"));

        long auditCount = tenantAuditEventRepository.countByTenantId(UUID.fromString(tenantId));
        org.junit.jupiter.api.Assertions.assertEquals(8L, auditCount);

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/audit-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tenantId").value(tenantId))
                .andExpect(jsonPath("$[0].action").isNotEmpty())
                .andExpect(jsonPath("$[7]").exists())
                .andExpect(jsonPath("$[8]").doesNotExist());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/audit-events?limit=2", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tenantId").value(tenantId))
                .andExpect(jsonPath("$[1].tenantId").value(tenantId))
                .andExpect(jsonPath("$[2]").doesNotExist());

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/audit-events?limit=0", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TENANT_REQUEST"));
    }

    @Test
    void rejectsUsageEventsWhenPlanLimitIsExceededAndWritesAuditEvidence() throws Exception {
        String tenantResponse = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "usage-limit-acme",
                                  "name": "Usage Limit Acme"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String tenantId = objectMapper.readTree(tenantResponse).path("tenantId").asText();

        mockMvc.perform(put("/internal/wl/tenants/{tenantId}/subscription", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "planCode": "starter-monthly",
                                  "status": "active",
                                  "billingCycle": "monthly",
                                  "currentPeriodStartsAt": "2030-01-01T00:00:00Z",
                                  "currentPeriodEndsAt": "2030-02-01T00:00:00Z"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planCode").value("starter-monthly"));

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventType": "game.round.completed",
                                  "eventValue": 900,
                                  "eventTime": "2030-01-10T00:00:00Z"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventValue").value(900));

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventType": "game.round.completed",
                                  "eventValue": 200,
                                  "eventTime": "2030-01-11T00:00:00Z"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLAN_LIMIT_REACHED"))
                .andExpect(jsonPath("$.error").value("plan limit reached for current period"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/audit-events?limit=1", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("TENANT_USAGE_LIMIT_REJECTED"))
                .andExpect(jsonPath("$[0].metadata.planCode").value("starter-monthly"))
                .andExpect(jsonPath("$[0].metadata.planLimit").value(1000))
                .andExpect(jsonPath("$[0].metadata.projectedTotal").value(1100));
    }

    @Test
    void createsSupportCasesAndReturnsDerivedPilotSummary() throws Exception {
        String tenantResponse = mockMvc.perform(post("/internal/wl/tenants")
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "pilot-summary-acme",
                                  "name": "Pilot Summary Acme"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String tenantId = objectMapper.readTree(tenantResponse).path("tenantId").asText();
        String actorUserId = UUID.randomUUID().toString();

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventType": "host.workspace.bootstrapped",
                                  "eventValue": 1,
                                  "eventTime": "2030-01-10T00:00:00Z"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventType": "host.session.started",
                                  "eventValue": 2,
                                  "eventTime": "2030-01-10T01:00:00Z"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/internal/wl/tenants/{tenantId}/usage-events", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventType": "billing.checkout.started",
                                  "eventValue": 1,
                                  "eventTime": "2030-01-10T02:00:00Z"
                                }
                                """))
                .andExpect(status().isOk());

        String supportCaseResponse = mockMvc.perform(post("/internal/wl/tenants/{tenantId}/support-cases", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .header("X-SmartIQ-Actor-User-Id", actorUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Host could not find join route",
                                  "category": "onboarding",
                                  "priority": "high",
                                  "owner": "Founder",
                                  "summary": "Pilot host stalled before first live launch.",
                                  "nextStep": "Update onboarding copy and retry."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("open"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String caseId = objectMapper.readTree(supportCaseResponse).path("caseId").asText();

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/support-cases", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].caseId").value(caseId))
                .andExpect(jsonPath("$[0].owner").value("Founder"))
                .andExpect(jsonPath("$[0].status").value("open"));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/pilot-summary", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activated").value(true))
                .andExpect(jsonPath("$.repeatHost").value(false))
                .andExpect(jsonPath("$.paidConverted").value(false))
                .andExpect(jsonPath("$.openSupportCases").value(1))
                .andExpect(jsonPath("$.topOpenSupportCategory").value("onboarding"))
                .andExpect(jsonPath("$.riskStatus").value("needs_attention"));

        mockMvc.perform(patch("/internal/wl/tenants/{tenantId}/support-cases/{caseId}", tenantId, caseId)
                        .header("X-Internal-Api-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "resolved",
                                  "resolution": "Updated onboarding copy."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("resolved"))
                .andExpect(jsonPath("$.resolution").value("Updated onboarding copy."));

        mockMvc.perform(get("/internal/wl/tenants/{tenantId}/pilot-summary", tenantId)
                        .header("X-Internal-Api-Key", "test-internal-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openSupportCases").value(0))
                .andExpect(jsonPath("$.resolvedSupportCases").value(1));
    }
}

