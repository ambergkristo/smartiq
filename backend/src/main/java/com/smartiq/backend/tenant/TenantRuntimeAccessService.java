package com.smartiq.backend.tenant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TenantRuntimeAccessService {

    private static final String AUDIT_ACTION_HOST_GAME_SESSION_CREATED = "HOST_GAME_SESSION_CREATED";
    private static final String AUDIT_ACTION_HOST_GAME_SESSION_COMPLETED = "HOST_GAME_SESSION_COMPLETED";
    private static final String AUDIT_ACTION_HOST_ROOM_CREATED = "HOST_ROOM_CREATED";
    private static final String AUDIT_ENTITY_HOST_GAME_SESSION = "host_game_session";
    private static final String AUDIT_ENTITY_HOST_ROOM = "host_room";
    private static final String USAGE_EVENT_HOST_WORKSPACE_BOOTSTRAPPED = "host.workspace.bootstrapped";
    private static final String USAGE_EVENT_HOST_AUTH_COMPLETED = "host.auth.completed";
    private static final String USAGE_EVENT_HOST_SESSION_STARTED = "host.session.started";
    private static final String USAGE_EVENT_HOST_SESSION_DUPLICATED = "host.session.duplicated";
    private static final String USAGE_EVENT_HOST_SESSION_RESUMED = "host.session.resumed";
    private static final String USAGE_EVENT_HOST_SESSION_COMPLETED = "host.session.completed";
    private static final String USAGE_EVENT_BILLING_CHECKOUT_STARTED = "billing.checkout.started";

    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final TenantMembershipRepository tenantMembershipRepository;
    private final TenantAuditEventRepository tenantAuditEventRepository;
    private final TenantBillingUsageService tenantBillingUsageService;
    private final ObjectMapper objectMapper;

    public TenantRuntimeAccessService(TenantRepository tenantRepository,
                                      TenantUserRepository tenantUserRepository,
                                      TenantMembershipRepository tenantMembershipRepository,
                                      TenantAuditEventRepository tenantAuditEventRepository,
                                      TenantBillingUsageService tenantBillingUsageService,
                                      ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.tenantMembershipRepository = tenantMembershipRepository;
        this.tenantAuditEventRepository = tenantAuditEventRepository;
        this.tenantBillingUsageService = tenantBillingUsageService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public MeResponse getMe(String userEmail, UUID requestedTenantId) {
        String email = TenantDomainSupport.normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));

        List<TenantMembership> memberships = tenantMembershipRepository.findByUserIdOrderByCreatedAtAsc(user.getId());
        if (memberships.isEmpty()) {
            throw new NoSuchElementException("membership not found");
        }

        var tenantIds = memberships.stream()
                .map(TenantMembership::getTenantId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Tenant> tenantsById = tenantRepository.findAllById(tenantIds).stream()
                .collect(Collectors.toMap(Tenant::getId, Function.identity()));

        List<MeTenantAccessResponse> membershipResponses = memberships.stream()
                .map(membership -> TenantDomainSupport.toMeTenantAccessResponse(membership, tenantsById))
                .toList();

        String selectedRole = null;
        if (requestedTenantId != null) {
            TenantMembership selectedMembership = memberships.stream()
                    .filter(membership -> membership.getTenantId().equals(requestedTenantId))
                    .findFirst()
                    .orElseThrow(() -> new ForbiddenTenantAccessException("user is not a member of requested tenant"));
            if (!TenantDomainSupport.STATUS_ACTIVE.equals(selectedMembership.getStatus())) {
                throw new ForbiddenTenantAccessException("user is not an active member of requested tenant");
            }
            Tenant selectedTenant = tenantsById.get(requestedTenantId);
            if (selectedTenant == null) {
                throw new NoSuchElementException("tenant not found");
            }
            TenantDomainSupport.ensureTenantIsActive(selectedTenant);
            selectedRole = selectedMembership.getRole();
        }

        return new MeResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                requestedTenantId,
                selectedRole,
                membershipResponses
        );
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse getTenantSubscriptionForMember(String userEmail, UUID tenantId) {
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
        return tenantBillingUsageService.getTenantSubscription(tenantId);
    }

    @Transactional(readOnly = true)
    public TenantRuntimeCapabilitiesResponse getTenantCapabilitiesForMember(String userEmail, UUID tenantId) {
        TenantSubscriptionResponse subscription = getTenantSubscriptionForMember(userEmail, tenantId);
        return TenantDomainSupport.resolveRuntimeCapabilities(tenantId, subscription);
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse assertHostedRuntimeAllowedForMember(String userEmail, UUID tenantId) {
        TenantSubscriptionResponse subscription = getTenantSubscriptionForMember(userEmail, tenantId);
        String status = TenantDomainSupport.normalizeOptional(subscription.status(), 32);
        if (status == null) {
            return subscription;
        }
        String normalizedStatus = TenantDomainSupport.normalizeSubscriptionStatus(status);
        if (TenantDomainSupport.SUBSCRIPTION_STATUS_ACTIVE.equals(normalizedStatus)
                || TenantDomainSupport.SUBSCRIPTION_STATUS_TRIALING.equals(normalizedStatus)) {
            return subscription;
        }
        throw new ForbiddenTenantAccessException("subscription status does not allow hosted runtime");
    }

    @Transactional(readOnly = true)
    public TenantRuntimeCapabilitiesResponse assertHostedGameSessionCreationAllowedForMember(String userEmail,
                                                                                             UUID tenantId,
                                                                                             List<String> players) {
        TenantSubscriptionResponse subscription = assertHostedRuntimeAllowedForMember(userEmail, tenantId);
        TenantRuntimeCapabilitiesResponse capabilities = TenantDomainSupport.resolveRuntimeCapabilities(tenantId, subscription);
        int playerCount = players == null ? 0 : (int) players.stream()
                .map(player -> TenantDomainSupport.normalizeOptional(player, 160))
                .filter(value -> value != null)
                .count();
        if (playerCount > capabilities.maxHostedPlayers()) {
            throw new ForbiddenTenantAccessException(
                    "current plan allows up to " + capabilities.maxHostedPlayers() + " hosted players"
            );
        }
        return capabilities;
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordHostGameSessionCreated(String userEmail,
                                             UUID tenantId,
                                             String gameId,
                                             int playerCount,
                                             String language,
                                             String topic) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("gameId", gameId);
        metadata.put("playerCount", playerCount);
        String normalizedLanguage = TenantDomainSupport.normalizeOptional(language, 16);
        if (normalizedLanguage != null) {
            metadata.put("language", normalizedLanguage);
        }
        String normalizedTopic = TenantDomainSupport.normalizeOptional(topic, 128);
        if (normalizedTopic != null) {
            metadata.put("topic", normalizedTopic);
        }
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_GAME_SESSION_CREATED,
                AUDIT_ENTITY_HOST_GAME_SESSION,
                gameId,
                metadata,
                now,
                me.userId()
        );
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_HOST_SESSION_STARTED, 1L, metadata, now);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordHostGameSessionCompleted(String userEmail,
                                               UUID tenantId,
                                               String gameId,
                                               String winnerDisplayName,
                                               Integer winnerScore,
                                               Integer roundNumber,
                                               String topic) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("gameId", gameId);
        String normalizedWinnerDisplayName = TenantDomainSupport.normalizeOptional(winnerDisplayName, 64);
        if (normalizedWinnerDisplayName != null) {
            metadata.put("winnerDisplayName", normalizedWinnerDisplayName);
        }
        if (winnerScore != null && winnerScore >= 0) {
            metadata.put("winnerScore", winnerScore);
        }
        if (roundNumber != null && roundNumber > 0) {
            metadata.put("roundNumber", roundNumber);
        }
        String normalizedTopic = TenantDomainSupport.normalizeOptional(topic, 128);
        if (normalizedTopic != null) {
            metadata.put("topic", normalizedTopic);
        }
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_GAME_SESSION_COMPLETED,
                AUDIT_ENTITY_HOST_GAME_SESSION,
                gameId,
                metadata,
                now,
                me.userId()
        );
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_HOST_SESSION_COMPLETED, 1L, metadata, now);
    }

    @Transactional
    public void recordHostRoomCreated(String userEmail, UUID tenantId, String roomCode) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("roomCode", roomCode);
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_ROOM_CREATED,
                AUDIT_ENTITY_HOST_ROOM,
                roomCode,
                metadata,
                now,
                me.userId()
        );
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordHostGameSessionDuplicated(String userEmail,
                                                UUID tenantId,
                                                String sourceGameId,
                                                String duplicatedGameId) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("sourceGameId", TenantDomainSupport.normalizeRequired(sourceGameId, "sourceGameId", 128));
        metadata.put("duplicatedGameId", TenantDomainSupport.normalizeRequired(duplicatedGameId, "duplicatedGameId", 128));
        metadata.put("userEmail", me.email());
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_HOST_SESSION_DUPLICATED, 1L, metadata, now);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordHostGameSessionResumed(String userEmail, UUID tenantId, String gameId) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("gameId", TenantDomainSupport.normalizeRequired(gameId, "gameId", 128));
        metadata.put("userEmail", me.email());
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_HOST_SESSION_RESUMED, 1L, metadata, now);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordHostWorkspaceBootstrapped(UUID tenantId, String ownerEmail) {
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("ownerEmail", TenantDomainSupport.normalizeEmail(ownerEmail));
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_HOST_WORKSPACE_BOOTSTRAPPED, 1L, metadata, now);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordRuntimeAuthCompleted(String userEmail, UUID tenantId) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("userEmail", me.email());
        String role = TenantDomainSupport.normalizeOptional(me.selectedRole(), 32);
        if (role != null) {
            metadata.put("role", role);
        }
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_HOST_AUTH_COMPLETED, 1L, metadata, now);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordBillingCheckoutStarted(String userEmail,
                                             UUID tenantId,
                                             String planCode,
                                             String billingCycle) {
        MeResponse me = requireRuntimeMemberContext(userEmail, tenantId);
        Instant now = Instant.now();
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("userEmail", me.email());
        metadata.put("planCode", TenantDomainSupport.normalizePlanCode(planCode));
        metadata.put("billingCycle", TenantDomainSupport.normalizeBillingCycle(billingCycle));
        tenantBillingUsageService.recordRuntimeUsageEvent(tenantId, USAGE_EVENT_BILLING_CHECKOUT_STARTED, 1L, metadata, now);
    }

    private MeResponse requireRuntimeMemberContext(String userEmail, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        return getMe(userEmail, tenantId);
    }

    private TenantMembership requireActiveMembership(UUID tenantId, UUID userId) {
        TenantMembership membership = tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .orElseThrow(() -> new ForbiddenTenantAccessException("user is not an active member of requested tenant"));
        if (!TenantDomainSupport.STATUS_ACTIVE.equals(membership.getStatus())) {
            throw new ForbiddenTenantAccessException("user is not an active member of requested tenant");
        }
        return membership;
    }

    private void recordAuditEvent(UUID tenantId,
                                  String action,
                                  String entityType,
                                  String entityId,
                                  JsonNode metadata,
                                  Instant eventTime,
                                  UUID actorUserId) {
        TenantAuditEvent event = new TenantAuditEvent();
        event.setId(UUID.randomUUID());
        event.setTenantId(tenantId);
        event.setActorUserId(actorUserId);
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setMetadataJson(writeJson(metadata));
        event.setEventTime(eventTime);
        event.setCreatedAt(eventTime);
        tenantAuditEventRepository.save(event);
    }

    private String writeJson(JsonNode jsonNode) {
        try {
            return objectMapper.writeValueAsString(jsonNode);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("settings payload is not serializable", ex);
        }
    }
}
