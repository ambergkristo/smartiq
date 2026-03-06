package com.smartiq.backend.tenant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/wl/tenants")
public class TenantAdminController {

    private static final String ACTOR_USER_ID_HEADER = "X-SmartIQ-Actor-User-Id";

    private final TenantService tenantService;

    public TenantAdminController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    public TenantDetailResponse createTenant(@RequestBody(required = false) CreateTenantRequest request,
                                             @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.createTenant(request, resolveActorUserId(actorUserIdHeader));
    }

    @GetMapping
    public List<TenantSummaryResponse> listTenants(@RequestParam(required = false) String status,
                                                   @RequestParam(name = "q", required = false) String query) {
        return tenantService.listTenants(status, query);
    }

    @GetMapping("/{tenantId}")
    public TenantDetailResponse getTenant(@PathVariable UUID tenantId) {
        return tenantService.getTenant(tenantId);
    }

    @PatchMapping("/{tenantId}/status")
    public TenantDetailResponse updateTenantStatus(@PathVariable UUID tenantId,
                                                   @RequestBody(required = false) UpdateTenantStatusRequest request,
                                                   @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.updateTenantStatus(tenantId, request, resolveActorUserId(actorUserIdHeader));
    }

    @PostMapping("/{tenantId}/members")
    public TenantMemberResponse addMember(@PathVariable UUID tenantId,
                                          @RequestBody(required = false) AddTenantMemberRequest request,
                                          @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.addMember(tenantId, request, resolveActorUserId(actorUserIdHeader));
    }

    @PatchMapping("/{tenantId}/members/{membershipId}")
    public TenantMemberResponse updateMember(@PathVariable UUID tenantId,
                                             @PathVariable UUID membershipId,
                                             @RequestBody(required = false) UpdateTenantMemberRequest request,
                                             @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.updateMember(tenantId, membershipId, request, resolveActorUserId(actorUserIdHeader));
    }

    @DeleteMapping("/{tenantId}/members/{membershipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable UUID tenantId,
                             @PathVariable UUID membershipId,
                             @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        tenantService.removeMember(tenantId, membershipId, resolveActorUserId(actorUserIdHeader));
    }

    @GetMapping("/{tenantId}/members")
    public List<TenantMemberResponse> listMembers(@PathVariable UUID tenantId) {
        return tenantService.listMembers(tenantId);
    }

    @GetMapping("/{tenantId}/audit-events")
    public List<TenantAuditEventResponse> listAuditEvents(@PathVariable UUID tenantId,
                                                          @RequestParam(required = false) Integer limit) {
        return tenantService.listTenantAuditEvents(tenantId, limit);
    }

    @GetMapping("/{tenantId}/subscription")
    public TenantSubscriptionResponse getSubscription(@PathVariable UUID tenantId) {
        return tenantService.getTenantSubscription(tenantId);
    }

    @PutMapping("/{tenantId}/subscription")
    public TenantSubscriptionResponse updateSubscription(@PathVariable UUID tenantId,
                                                         @RequestBody(required = false) UpdateTenantSubscriptionRequest request,
                                                         @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.updateTenantSubscription(tenantId, request, resolveActorUserId(actorUserIdHeader));
    }

    @PostMapping("/{tenantId}/usage-events")
    public TenantUsageEventResponse createUsageEvent(@PathVariable UUID tenantId,
                                                     @RequestBody(required = false) CreateTenantUsageEventRequest request) {
        return tenantService.createTenantUsageEvent(tenantId, request);
    }

    @GetMapping("/{tenantId}/usage-events")
    public List<TenantUsageEventResponse> listUsageEvents(@PathVariable UUID tenantId,
                                                          @RequestParam(required = false) String eventType,
                                                          @RequestParam(required = false) Integer limit) {
        return tenantService.listTenantUsageEvents(tenantId, eventType, limit);
    }

    @GetMapping("/{tenantId}/usage-summary")
    public List<TenantUsageSummaryResponse> getUsageSummary(@PathVariable UUID tenantId,
                                                            @RequestParam(required = false) String eventType,
                                                            @RequestParam(required = false) String from,
                                                            @RequestParam(required = false) String to) {
        return tenantService.getTenantUsageSummary(tenantId, eventType, from, to);
    }

    @GetMapping("/{tenantId}/pilot-summary")
    public TenantPilotSummaryResponse getPilotSummary(@PathVariable UUID tenantId) {
        return tenantService.getTenantPilotSummary(tenantId);
    }

    @GetMapping("/{tenantId}/support-cases")
    public List<TenantSupportCaseResponse> listSupportCases(@PathVariable UUID tenantId) {
        return tenantService.listTenantSupportCases(tenantId);
    }

    @PostMapping("/{tenantId}/support-cases")
    public TenantSupportCaseResponse createSupportCase(@PathVariable UUID tenantId,
                                                       @RequestBody(required = false) CreateTenantSupportCaseRequest request,
                                                       @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.createTenantSupportCase(tenantId, request, resolveActorUserId(actorUserIdHeader));
    }

    @PatchMapping("/{tenantId}/support-cases/{caseId}")
    public TenantSupportCaseResponse updateSupportCase(@PathVariable UUID tenantId,
                                                       @PathVariable String caseId,
                                                       @RequestBody(required = false) UpdateTenantSupportCaseRequest request,
                                                       @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.updateTenantSupportCase(tenantId, caseId, request, resolveActorUserId(actorUserIdHeader));
    }

    @GetMapping("/{tenantId}/settings")
    public TenantSettingsResponse getSettings(@PathVariable UUID tenantId) {
        return tenantService.getTenantSettings(tenantId);
    }

    @PutMapping("/{tenantId}/settings")
    public TenantSettingsResponse updateSettings(@PathVariable UUID tenantId,
                                                 @RequestBody(required = false) UpdateTenantSettingsRequest request,
                                                 @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.updateTenantSettings(tenantId, request, resolveActorUserId(actorUserIdHeader));
    }

    @PatchMapping("/{tenantId}/branding")
    public TenantDetailResponse updateBranding(@PathVariable UUID tenantId,
                                               @RequestBody(required = false) UpdateTenantBrandingRequest request,
                                               @RequestHeader(name = ACTOR_USER_ID_HEADER, required = false) String actorUserIdHeader) {
        return tenantService.updateBranding(tenantId, request, resolveActorUserId(actorUserIdHeader));
    }

    private UUID resolveActorUserId(String actorUserIdHeader) {
        if (actorUserIdHeader == null || actorUserIdHeader.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(actorUserIdHeader.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(ACTOR_USER_ID_HEADER + " must be a UUID", ex);
        }
    }
}
