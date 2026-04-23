package com.smartiq.backend.tenant;

import com.smartiq.backend.auth.RuntimeAuthTokenService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class TenantService {
    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final TenantMembershipRepository tenantMembershipRepository;
    private final RuntimeAuthTokenService runtimeAuthTokenService;
    private final TenantAdminService tenantAdminService;
    private final TenantSupportCaseService tenantSupportCaseService;
    private final TenantRuntimeSettingsService tenantRuntimeSettingsService;
    private final TenantBillingUsageService tenantBillingUsageService;
    private final TenantRuntimeAccessService tenantRuntimeAccessService;

    public TenantService(TenantRepository tenantRepository,
                         TenantUserRepository tenantUserRepository,
                         TenantMembershipRepository tenantMembershipRepository,
                         RuntimeAuthTokenService runtimeAuthTokenService,
                         TenantAdminService tenantAdminService,
                         TenantSupportCaseService tenantSupportCaseService,
                         TenantRuntimeSettingsService tenantRuntimeSettingsService,
                         TenantBillingUsageService tenantBillingUsageService,
                         TenantRuntimeAccessService tenantRuntimeAccessService) {
        this.tenantRepository = tenantRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.tenantMembershipRepository = tenantMembershipRepository;
        this.runtimeAuthTokenService = runtimeAuthTokenService;
        this.tenantAdminService = tenantAdminService;
        this.tenantSupportCaseService = tenantSupportCaseService;
        this.tenantRuntimeSettingsService = tenantRuntimeSettingsService;
        this.tenantBillingUsageService = tenantBillingUsageService;
        this.tenantRuntimeAccessService = tenantRuntimeAccessService;
    }

    @Transactional
    public TenantDetailResponse createTenant(CreateTenantRequest request) {
        return createTenant(request, null);
    }

    @Transactional
    public TenantDetailResponse createTenant(CreateTenantRequest request, UUID actorUserId) {
        return tenantAdminService.createTenant(request, actorUserId);
    }

    @Transactional
    public OnboardingBootstrapResponse bootstrapOnboarding(OnboardingBootstrapRequest request) {
        String workspaceName = TenantDomainSupport.normalizeRequired(request == null ? null : request.workspaceName(), "workspaceName", 160);
        String ownerEmail = TenantDomainSupport.normalizeEmail(request == null ? null : request.ownerEmail());
        String ownerDisplayName = TenantDomainSupport.normalizeOptional(request == null ? null : request.ownerDisplayName(), 160);

        String slug = tenantAdminService.generateUniqueOnboardingSlug(workspaceName);
        TenantDetailResponse tenant = tenantAdminService.createTenant(new CreateTenantRequest(slug, workspaceName, null, ownerEmail), null);
        TenantMemberResponse member = tenantAdminService.addMember(
                tenant.tenantId(),
                new AddTenantMemberRequest(ownerEmail, ownerDisplayName, TenantDomainSupport.ROLE_OWNER),
                null
        );
        MeResponse me = tenantRuntimeAccessService.getMe(ownerEmail, tenant.tenantId());
        RuntimeAuthContextResponse runtimeAuth = new RuntimeAuthContextResponse(
                runtimeAuthTokenService.issueBearerToken(ownerEmail, tenant.tenantId()),
                ownerEmail,
                tenant.tenantId()
        );
        tenantRuntimeAccessService.recordHostWorkspaceBootstrapped(tenant.tenantId(), ownerEmail);

        return new OnboardingBootstrapResponse(tenant, member, me, runtimeAuth);
    }

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> listTenants() {
        return listTenants(null, null);
    }

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> listTenants(String statusFilter, String query) {
        return tenantAdminService.listTenants(statusFilter, query);
    }

    @Transactional(readOnly = true)
    public TenantDetailResponse getTenant(UUID tenantId) {
        return tenantAdminService.getTenant(tenantId);
    }

    @Transactional
    public TenantDetailResponse updateTenantStatus(UUID tenantId, UpdateTenantStatusRequest request) {
        return updateTenantStatus(tenantId, request, null);
    }

    @Transactional
    public TenantDetailResponse updateTenantStatus(UUID tenantId, UpdateTenantStatusRequest request, UUID actorUserId) {
        return tenantAdminService.updateTenantStatus(tenantId, request, actorUserId);
    }

    @Transactional
    public TenantDetailResponse updateBranding(UUID tenantId, UpdateTenantBrandingRequest request) {
        return updateBranding(tenantId, request, null);
    }

    @Transactional
    public TenantDetailResponse updateBranding(UUID tenantId, UpdateTenantBrandingRequest request, UUID actorUserId) {
        return tenantAdminService.updateBranding(tenantId, request, actorUserId);
    }

    @Transactional
    public TenantMemberResponse addMember(UUID tenantId, AddTenantMemberRequest request) {
        return addMember(tenantId, request, null);
    }

    @Transactional
    public TenantMemberResponse addMember(UUID tenantId, AddTenantMemberRequest request, UUID actorUserId) {
        return tenantAdminService.addMember(tenantId, request, actorUserId);
    }

    @Transactional
    public TenantMemberResponse updateMember(UUID tenantId, UUID membershipId, UpdateTenantMemberRequest request) {
        return updateMember(tenantId, membershipId, request, null);
    }

    @Transactional
    public TenantMemberResponse updateMember(UUID tenantId,
                                             UUID membershipId,
                                             UpdateTenantMemberRequest request,
                                             UUID actorUserId) {
        return tenantAdminService.updateMember(tenantId, membershipId, request, actorUserId);
    }

    @Transactional
    public void removeMember(UUID tenantId, UUID membershipId) {
        removeMember(tenantId, membershipId, null);
    }

    @Transactional
    public void removeMember(UUID tenantId, UUID membershipId, UUID actorUserId) {
        tenantAdminService.removeMember(tenantId, membershipId, actorUserId);
    }

    @Transactional(readOnly = true)
    public List<TenantMemberResponse> listMembers(UUID tenantId) {
        return tenantAdminService.listMembers(tenantId);
    }

    @Transactional(readOnly = true)
    public List<TenantAuditEventResponse> listTenantAuditEvents(UUID tenantId, Integer limit) {
        return tenantAdminService.listTenantAuditEvents(tenantId, limit);
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse getTenantSubscription(UUID tenantId) {
        return tenantBillingUsageService.getTenantSubscription(tenantId);
    }

    @Transactional
    public TenantSubscriptionResponse updateTenantSubscription(UUID tenantId, UpdateTenantSubscriptionRequest request) {
        return updateTenantSubscription(tenantId, request, null);
    }

    @Transactional
    public TenantSubscriptionResponse updateTenantSubscription(UUID tenantId,
                                                               UpdateTenantSubscriptionRequest request,
                                                               UUID actorUserId) {
        return tenantBillingUsageService.updateTenantSubscription(tenantId, request, actorUserId);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public TenantUsageEventResponse createTenantUsageEvent(UUID tenantId, CreateTenantUsageEventRequest request) {
        return tenantBillingUsageService.createTenantUsageEvent(tenantId, request);
    }

    @Transactional(readOnly = true)
    public List<TenantUsageEventResponse> listTenantUsageEvents(UUID tenantId, String eventType, Integer limit) {
        return tenantBillingUsageService.listTenantUsageEvents(tenantId, eventType, limit);
    }

    @Transactional(readOnly = true)
    public List<TenantUsageSummaryResponse> getTenantUsageSummary(UUID tenantId,
                                                                  String eventType,
                                                                  String from,
                                                                  String to) {
        return tenantBillingUsageService.getTenantUsageSummary(tenantId, eventType, from, to);
    }

    @Transactional(readOnly = true)
    public TenantPilotSummaryResponse getTenantPilotSummary(UUID tenantId) {
        return tenantBillingUsageService.getTenantPilotSummary(tenantId);
    }

    @Transactional(readOnly = true)
    public List<TenantSupportCaseResponse> listTenantSupportCases(UUID tenantId) {
        return tenantSupportCaseService.listSupportCases(tenantId);
    }

    @Transactional
    public TenantSupportCaseResponse createTenantSupportCase(UUID tenantId,
                                                             CreateTenantSupportCaseRequest request,
                                                             UUID actorUserId) {
        return tenantSupportCaseService.createSupportCase(tenantId, request, actorUserId);
    }

    @Transactional
    public TenantSupportCaseResponse updateTenantSupportCase(UUID tenantId,
                                                             String caseId,
                                                             UpdateTenantSupportCaseRequest request,
                                                             UUID actorUserId) {
        return tenantSupportCaseService.updateSupportCase(tenantId, caseId, request, actorUserId);
    }

    @Transactional(readOnly = true)
    public TenantSettingsResponse getTenantSettings(UUID tenantId) {
        return tenantRuntimeSettingsService.getTenantSettings(tenantId);
    }

    @Transactional
    public TenantSettingsResponse updateTenantSettings(UUID tenantId, UpdateTenantSettingsRequest request) {
        return tenantRuntimeSettingsService.updateTenantSettings(tenantId, request, null);
    }

    @Transactional
    public TenantSettingsResponse updateTenantSettings(UUID tenantId,
                                                       UpdateTenantSettingsRequest request,
                                                       UUID actorUserId) {
        return tenantRuntimeSettingsService.updateTenantSettings(tenantId, request, actorUserId);
    }

    @Transactional(readOnly = true)
    public TenantSettingsResponse getTenantSettingsForMember(String userEmail, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        String email = TenantDomainSupport.normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        requireActiveMembership(tenantId, user.getId());
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        TenantDomainSupport.ensureTenantIsActive(tenant);
        return tenantRuntimeSettingsService.getTenantSettings(tenantId);
    }

    @Transactional(readOnly = true)
    public TenantBrandingRuntimeResponse getTenantBrandingForMember(String userEmail, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }

        String email = TenantDomainSupport.normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        requireActiveMembership(tenantId, user.getId());

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        TenantDomainSupport.ensureTenantIsActive(tenant);
        return tenantRuntimeSettingsService.getTenantBrandingRuntime(tenantId);
    }

    @Transactional
    public TenantBrandingRuntimeResponse updateBrandingForMember(String userEmail,
                                                                 UUID tenantId,
                                                                 UpdateTenantBrandingRequest request) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        MeResponse me = tenantRuntimeAccessService.getMe(userEmail, tenantId);
        String normalizedRole = TenantDomainSupport.normalizeOptional(me.selectedRole(), 32);
        if (!TenantDomainSupport.ROLE_OWNER.equals(normalizedRole) && !TenantDomainSupport.ROLE_ADMIN.equals(normalizedRole)) {
            throw new ForbiddenTenantAccessException("current role does not allow tenant branding updates");
        }
        TenantRuntimeCapabilitiesResponse capabilities = getTenantCapabilitiesForMember(userEmail, tenantId);
        if (!capabilities.customBrandingEnabled()) {
            throw new ForbiddenTenantAccessException("current plan does not include custom branding");
        }
        updateBranding(tenantId, request, me.userId());
        return tenantRuntimeSettingsService.getTenantBrandingRuntime(tenantId);
    }

    @Transactional
    public TenantRuntimeSessionTemplatesResponse upsertSessionTemplateForMember(String userEmail,
                                                                                UUID tenantId,
                                                                                String templateId,
                                                                                RuntimeSessionTemplateUpsertRequest request) {
        MeResponse me = assertSessionTemplateAccess(userEmail, tenantId);
        return tenantRuntimeSettingsService.upsertSessionTemplate(tenantId, templateId, request, me.userId());
    }

    @Transactional
    public TenantRuntimeSessionTemplatesResponse deleteSessionTemplateForMember(String userEmail,
                                                                                UUID tenantId,
                                                                                String templateId) {
        MeResponse me = assertSessionTemplateAccess(userEmail, tenantId);
        return tenantRuntimeSettingsService.deleteSessionTemplate(tenantId, templateId, me.userId());
    }

    @Transactional
    public TenantRuntimeSessionReviewNotesResponse upsertSessionReviewNoteForMember(String userEmail,
                                                                                    UUID tenantId,
                                                                                    String gameId,
                                                                                    RuntimeSessionReviewNoteUpsertRequest request) {
        MeResponse me = assertSessionReviewNoteAccess(userEmail, tenantId);
        return tenantRuntimeSettingsService.upsertSessionReviewNote(tenantId, gameId, request, me.userId());
    }

    @Transactional
    public TenantRuntimeSessionReviewNotesResponse deleteSessionReviewNoteForMember(String userEmail,
                                                                                    UUID tenantId,
                                                                                    String gameId) {
        MeResponse me = assertSessionReviewNoteAccess(userEmail, tenantId);
        return tenantRuntimeSettingsService.deleteSessionReviewNote(tenantId, gameId, me.userId());
    }

    @Transactional(readOnly = true)
    public TenantBrandingRuntimeResponse getTenantBrandingForRuntimeTenant(UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        return tenantRuntimeSettingsService.getTenantBrandingRuntime(tenantId);
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse getTenantSubscriptionForMember(String userEmail, UUID tenantId) {
        return tenantRuntimeAccessService.getTenantSubscriptionForMember(userEmail, tenantId);
    }

    @Transactional(readOnly = true)
    public List<TenantAuditEventResponse> listTenantAuditEventsForMember(String userEmail, UUID tenantId, Integer limit) {
        TenantRuntimeCapabilitiesResponse capabilities = getTenantCapabilitiesForMember(userEmail, tenantId);
        if (!capabilities.analyticsHistoryEnabled()) {
            throw new ForbiddenTenantAccessException("current plan does not include host analytics/history");
        }
        return listTenantAuditEvents(tenantId, limit);
    }

    @Transactional(readOnly = true)
    public List<TenantUsageSummaryResponse> getTenantUsageSummaryForMember(String userEmail,
                                                                           UUID tenantId,
                                                                           String eventType,
                                                                           String from,
                                                                           String to) {
        TenantRuntimeCapabilitiesResponse capabilities = getTenantCapabilitiesForMember(userEmail, tenantId);
        if (!capabilities.analyticsHistoryEnabled()) {
            throw new ForbiddenTenantAccessException("current plan does not include host analytics/history");
        }
        return getTenantUsageSummary(tenantId, eventType, from, to);
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse assertHostedRuntimeAllowedForMember(String userEmail, UUID tenantId) {
        return tenantRuntimeAccessService.assertHostedRuntimeAllowedForMember(userEmail, tenantId);
    }

    @Transactional(readOnly = true)
    public TenantRuntimeCapabilitiesResponse getTenantCapabilitiesForMember(String userEmail, UUID tenantId) {
        return tenantRuntimeAccessService.getTenantCapabilitiesForMember(userEmail, tenantId);
    }

    @Transactional(readOnly = true)
    public TenantRuntimeCapabilitiesResponse assertHostedGameSessionCreationAllowedForMember(String userEmail,
                                                                                             UUID tenantId,
                                                                                             List<String> players) {
        return tenantRuntimeAccessService.assertHostedGameSessionCreationAllowedForMember(userEmail, tenantId, players);
    }

    @Transactional
    public void recordHostGameSessionCreated(String userEmail,
                                             UUID tenantId,
                                             String gameId,
                                             int playerCount,
                                             String language,
                                             String topic) {
        tenantRuntimeAccessService.recordHostGameSessionCreated(userEmail, tenantId, gameId, playerCount, language, topic);
    }

    @Transactional
    public void recordHostGameSessionCompleted(String userEmail,
                                               UUID tenantId,
                                               String gameId,
                                               String winnerDisplayName,
                                               Integer winnerScore,
                                               Integer roundNumber,
                                               String topic) {
        tenantRuntimeAccessService.recordHostGameSessionCompleted(userEmail, tenantId, gameId, winnerDisplayName, winnerScore, roundNumber, topic);
    }

    @Transactional
    public void recordHostRoomCreated(String userEmail, UUID tenantId, String roomCode) {
        tenantRuntimeAccessService.recordHostRoomCreated(userEmail, tenantId, roomCode);
    }

    @Transactional
    public void recordHostGameSessionDuplicated(String userEmail,
                                                UUID tenantId,
                                                String sourceGameId,
                                                String duplicatedGameId) {
        tenantRuntimeAccessService.recordHostGameSessionDuplicated(userEmail, tenantId, sourceGameId, duplicatedGameId);
    }

    @Transactional
    public void recordHostGameSessionResumed(String userEmail, UUID tenantId, String gameId) {
        tenantRuntimeAccessService.recordHostGameSessionResumed(userEmail, tenantId, gameId);
    }

    @Transactional
    public void recordHostWorkspaceBootstrapped(UUID tenantId, String ownerEmail) {
        tenantRuntimeAccessService.recordHostWorkspaceBootstrapped(tenantId, ownerEmail);
    }

    @Transactional
    public void recordRuntimeAuthCompleted(String userEmail, UUID tenantId) {
        tenantRuntimeAccessService.recordRuntimeAuthCompleted(userEmail, tenantId);
    }

    @Transactional
    public void recordBillingCheckoutStarted(String userEmail,
                                             UUID tenantId,
                                             String planCode,
                                             String billingCycle) {
        tenantRuntimeAccessService.recordBillingCheckoutStarted(userEmail, tenantId, planCode, billingCycle);
    }

    @Transactional
    public void recordBillingSubscriptionLifecycle(UUID tenantId,
                                                   String planCode,
                                                   String status,
                                                   String billingCycle,
                                                   Instant eventTime) {
        tenantBillingUsageService.recordBillingSubscriptionLifecycle(tenantId, planCode, status, billingCycle, eventTime);
    }

    @Transactional(readOnly = true)
    public MeResponse getMe(String userEmail, UUID requestedTenantId) {
        return tenantRuntimeAccessService.getMe(userEmail, requestedTenantId);
    }

    private MeResponse assertSessionTemplateAccess(String userEmail, UUID tenantId) {
        MeResponse me = tenantRuntimeAccessService.getMe(userEmail, tenantId);
        TenantRuntimeCapabilitiesResponse capabilities = getTenantCapabilitiesForMember(userEmail, tenantId);
        if (!capabilities.sessionTemplatesEnabled()) {
            throw new ForbiddenTenantAccessException("current plan does not include session templates");
        }
        return me;
    }

    private MeResponse assertSessionReviewNoteAccess(String userEmail, UUID tenantId) {
        MeResponse me = tenantRuntimeAccessService.getMe(userEmail, tenantId);
        TenantRuntimeCapabilitiesResponse capabilities = getTenantCapabilitiesForMember(userEmail, tenantId);
        if (!capabilities.analyticsHistoryEnabled()) {
            throw new ForbiddenTenantAccessException("current plan does not include host analytics/history");
        }
        return me;
    }

    private TenantMembership requireActiveMembership(UUID tenantId, UUID userId) {
        TenantMembership membership = tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .orElseThrow(() -> new ForbiddenTenantAccessException("user is not an active member of requested tenant"));
        if (!TenantDomainSupport.STATUS_ACTIVE.equals(membership.getStatus())) {
            throw new ForbiddenTenantAccessException("user is not an active member of requested tenant");
        }
        return membership;
    }
}
