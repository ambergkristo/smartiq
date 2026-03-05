package com.smartiq.backend.tenant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TenantService {

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9-]{3,63}$");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9A-Fa-f]{6}$");
    private static final Pattern PLAN_CODE_PATTERN = Pattern.compile("^[a-z0-9._-]{2,64}$");
    private static final Set<String> ALLOWED_TENANT_STATUSES = Set.of("active", "suspended");
    private static final Set<String> ALLOWED_MEMBERSHIP_ROLES = Set.of("owner", "admin", "editor", "viewer");
    private static final Set<String> ALLOWED_MEMBERSHIP_STATUSES = Set.of("active", "suspended");
    private static final Set<String> ALLOWED_SUBSCRIPTION_STATUSES = Set.of("trialing", "active", "past_due", "canceled");
    private static final Set<String> ALLOWED_BILLING_CYCLES = Set.of("monthly", "annual");
    private static final Set<String> ALLOWED_THEMES = Set.of("classic", "ember", "ocean");
    private static final Set<String> ALLOWED_SETTINGS_KEYS = Set.of("schemaVersion", "theme", "game", "features");
    private static final Set<String> ALLOWED_GAME_SETTINGS_KEYS = Set.of("maxPlayers", "roundsPerMatch");
    private static final Set<String> ALLOWED_FEATURE_SETTINGS_KEYS = Set.of("leaderboardEnabled", "teamsEnabled");
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_SUSPENDED = "suspended";
    private static final String ROLE_OWNER = "owner";
    private static final String AUTH_PROVIDER_MANUAL = "manual";
    private static final String AUDIT_ACTION_TENANT_CREATED = "TENANT_CREATED";
    private static final String AUDIT_ACTION_TENANT_BRANDING_UPDATED = "TENANT_BRANDING_UPDATED";
    private static final String AUDIT_ACTION_TENANT_STATUS_UPDATED = "TENANT_STATUS_UPDATED";
    private static final String AUDIT_ACTION_TENANT_MEMBER_ADDED = "TENANT_MEMBER_ADDED";
    private static final String AUDIT_ACTION_TENANT_MEMBER_UPDATED = "TENANT_MEMBER_UPDATED";
    private static final String AUDIT_ACTION_TENANT_MEMBER_REMOVED = "TENANT_MEMBER_REMOVED";
    private static final String AUDIT_ACTION_TENANT_SETTINGS_UPDATED = "TENANT_SETTINGS_UPDATED";
    private static final String AUDIT_ACTION_TENANT_SUBSCRIPTION_UPDATED = "TENANT_SUBSCRIPTION_UPDATED";
    private static final String AUDIT_ENTITY_TENANT = "tenant";
    private static final String AUDIT_ENTITY_TENANT_BRANDING = "tenant_branding";
    private static final String AUDIT_ENTITY_TENANT_MEMBERSHIP = "tenant_membership";
    private static final String AUDIT_ENTITY_TENANT_SETTINGS = "tenant_settings";
    private static final String AUDIT_ENTITY_TENANT_SUBSCRIPTION = "tenant_subscription";
    private static final int SETTINGS_SCHEMA_VERSION = 1;
    private static final String DEFAULT_THEME = "classic";
    private static final int DEFAULT_MAX_PLAYERS = 10;
    private static final int DEFAULT_ROUNDS_PER_MATCH = 10;
    private static final boolean DEFAULT_LEADERBOARD_ENABLED = false;
    private static final boolean DEFAULT_TEAMS_ENABLED = false;
    private static final int DEFAULT_AUDIT_LIMIT = 50;
    private static final int MAX_AUDIT_LIMIT = 200;
    private static final int DEFAULT_USAGE_LIMIT = 100;
    private static final int MAX_USAGE_LIMIT = 500;

    private final TenantRepository tenantRepository;
    private final TenantBrandingRepository tenantBrandingRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final TenantSubscriptionRepository tenantSubscriptionRepository;
    private final TenantUsageEventRepository tenantUsageEventRepository;
    private final TenantAuditEventRepository tenantAuditEventRepository;
    private final TenantUserRepository tenantUserRepository;
    private final TenantMembershipRepository tenantMembershipRepository;
    private final ObjectMapper objectMapper;

    public TenantService(TenantRepository tenantRepository,
                         TenantBrandingRepository tenantBrandingRepository,
                         TenantSettingsRepository tenantSettingsRepository,
                         TenantSubscriptionRepository tenantSubscriptionRepository,
                         TenantUsageEventRepository tenantUsageEventRepository,
                         TenantAuditEventRepository tenantAuditEventRepository,
                         TenantUserRepository tenantUserRepository,
                         TenantMembershipRepository tenantMembershipRepository,
                         ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantBrandingRepository = tenantBrandingRepository;
        this.tenantSettingsRepository = tenantSettingsRepository;
        this.tenantSubscriptionRepository = tenantSubscriptionRepository;
        this.tenantUsageEventRepository = tenantUsageEventRepository;
        this.tenantAuditEventRepository = tenantAuditEventRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.tenantMembershipRepository = tenantMembershipRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TenantDetailResponse createTenant(CreateTenantRequest request) {
        return createTenant(request, null);
    }

    @Transactional
    public TenantDetailResponse createTenant(CreateTenantRequest request, UUID actorUserId) {
        String name = normalizeRequired(request == null ? null : request.name(), "name", 160);
        String slug = normalizeSlug(request == null ? null : request.slug(), name);
        if (tenantRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("tenant slug already exists");
        }

        String legalEntityName = normalizeOptional(request == null ? null : request.legalEntityName(), 200);
        String billingEmail = normalizeOptional(request == null ? null : request.billingEmail(), 320);

        Instant now = Instant.now();
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setSlug(slug);
        tenant.setName(name);
        tenant.setLegalEntityName(legalEntityName);
        tenant.setBillingEmail(billingEmail);
        tenant.setStatus(STATUS_ACTIVE);
        tenant.setCreatedAt(now);
        tenant.setUpdatedAt(now);
        tenantRepository.save(tenant);

        TenantBranding branding = new TenantBranding();
        branding.setTenantId(tenant.getId());
        branding.setAppName(name);
        branding.setLogoUrl(null);
        branding.setPrimaryColor("#1E293B");
        branding.setSecondaryColor("#0EA5E9");
        branding.setCreatedAt(now);
        branding.setUpdatedAt(now);
        tenantBrandingRepository.save(branding);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("slug", tenant.getSlug());
        metadata.put("status", tenant.getStatus());
        recordAuditEvent(
                tenant.getId(),
                AUDIT_ACTION_TENANT_CREATED,
                AUDIT_ENTITY_TENANT,
                tenant.getId().toString(),
                metadata,
                now,
                actorUserId
        );

        return toDetail(tenant, branding);
    }

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> listTenants() {
        return listTenants(null, null);
    }

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> listTenants(String statusFilter, String query) {
        String normalizedStatus = normalizeOptionalTenantStatus(statusFilter);
        String normalizedQuery = normalizeOptional(query, 160);
        String queryLower = normalizedQuery == null ? null : normalizedQuery.toLowerCase(Locale.ROOT);

        return tenantRepository.findAll().stream()
                .filter(tenant -> normalizedStatus == null || normalizedStatus.equals(tenant.getStatus()))
                .filter(tenant -> queryLower == null
                        || tenant.getName().toLowerCase(Locale.ROOT).contains(queryLower)
                        || tenant.getSlug().toLowerCase(Locale.ROOT).contains(queryLower))
                .map(tenant -> new TenantSummaryResponse(
                        tenant.getId(),
                        tenant.getSlug(),
                        tenant.getName(),
                        tenant.getStatus(),
                        tenant.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantDetailResponse getTenant(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        TenantBranding branding = tenantBrandingRepository.findById(tenantId).orElseGet(() -> defaultBranding(tenant));
        return toDetail(tenant, branding);
    }

    @Transactional
    public TenantDetailResponse updateTenantStatus(UUID tenantId, UpdateTenantStatusRequest request) {
        return updateTenantStatus(tenantId, request, null);
    }

    @Transactional
    public TenantDetailResponse updateTenantStatus(UUID tenantId, UpdateTenantStatusRequest request, UUID actorUserId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        TenantBranding branding = tenantBrandingRepository.findById(tenantId).orElseGet(() -> defaultBranding(tenant));

        String status = normalizeTenantStatus(request == null ? null : request.status());
        if (status.equals(tenant.getStatus())) {
            return toDetail(tenant, branding);
        }

        Instant now = Instant.now();
        String previousStatus = tenant.getStatus();
        tenant.setStatus(status);
        tenant.setUpdatedAt(now);
        tenantRepository.save(tenant);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("previousStatus", previousStatus);
        metadata.put("status", status);
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_STATUS_UPDATED,
                AUDIT_ENTITY_TENANT,
                tenantId.toString(),
                metadata,
                now,
                actorUserId
        );

        return toDetail(tenant, branding);
    }

    @Transactional
    public TenantDetailResponse updateBranding(UUID tenantId, UpdateTenantBrandingRequest request) {
        return updateBranding(tenantId, request, null);
    }

    @Transactional
    public TenantDetailResponse updateBranding(UUID tenantId, UpdateTenantBrandingRequest request, UUID actorUserId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));

        TenantBranding branding = tenantBrandingRepository.findById(tenantId).orElseGet(() -> defaultBranding(tenant));
        Instant now = Instant.now();
        if (branding.getCreatedAt() == null) {
            branding.setCreatedAt(now);
        }

        String appName = normalizeRequired(request == null ? null : request.appName(), "appName", 160);
        String logoUrl = normalizeOptional(request == null ? null : request.logoUrl(), 1024);
        String primaryColor = normalizeColor(request == null ? null : request.primaryColor(), "primaryColor");
        String secondaryColor = normalizeColor(request == null ? null : request.secondaryColor(), "secondaryColor");

        branding.setTenantId(tenantId);
        branding.setAppName(appName);
        branding.setLogoUrl(logoUrl);
        branding.setPrimaryColor(primaryColor);
        branding.setSecondaryColor(secondaryColor);
        branding.setUpdatedAt(now);
        tenantBrandingRepository.save(branding);

        tenant.setUpdatedAt(now);
        tenantRepository.save(tenant);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("appName", branding.getAppName());
        metadata.put("themePrimary", branding.getPrimaryColor());
        metadata.put("themeSecondary", branding.getSecondaryColor());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_BRANDING_UPDATED,
                AUDIT_ENTITY_TENANT_BRANDING,
                tenantId.toString(),
                metadata,
                now,
                actorUserId
        );

        return toDetail(tenant, branding);
    }

    @Transactional
    public TenantMemberResponse addMember(UUID tenantId, AddTenantMemberRequest request) {
        return addMember(tenantId, request, null);
    }

    @Transactional
    public TenantMemberResponse addMember(UUID tenantId, AddTenantMemberRequest request, UUID actorUserId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String email = normalizeEmail(request == null ? null : request.email());
        String displayName = normalizeOptional(request == null ? null : request.displayName(), 160);
        String role = normalizeMembershipRole(request == null ? null : request.role());
        Instant now = Instant.now();

        TenantUser user = tenantUserRepository.findByEmail(email).orElseGet(() -> {
            TenantUser created = new TenantUser();
            created.setId(UUID.randomUUID());
            created.setEmail(email);
            created.setDisplayName(displayName);
            created.setAuthProvider(AUTH_PROVIDER_MANUAL);
            created.setExternalSubject(null);
            created.setStatus(STATUS_ACTIVE);
            created.setCreatedAt(now);
            created.setUpdatedAt(now);
            return created;
        });

        if (user.getId() == null) {
            user.setId(UUID.randomUUID());
            user.setCreatedAt(now);
        }
        if (user.getDisplayName() == null && displayName != null) {
            user.setDisplayName(displayName);
        }
        user.setUpdatedAt(now);
        tenantUserRepository.save(user);

        if (tenantMembershipRepository.existsByTenantIdAndUserId(tenantId, user.getId())) {
            throw new DuplicateTenantMembershipException("membership already exists for this tenant and user");
        }

        TenantMembership membership = new TenantMembership();
        membership.setId(UUID.randomUUID());
        membership.setTenantId(tenantId);
        membership.setUser(user);
        membership.setRole(role);
        membership.setStatus(STATUS_ACTIVE);
        membership.setCreatedAt(now);
        membership.setUpdatedAt(now);
        tenantMembershipRepository.save(membership);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("email", user.getEmail());
        metadata.put("role", membership.getRole());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_MEMBER_ADDED,
                AUDIT_ENTITY_TENANT_MEMBERSHIP,
                membership.getId().toString(),
                metadata,
                now,
                actorUserId
        );

        return toMemberResponse(membership);
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
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
        if (membershipId == null) {
            throw new IllegalArgumentException("membershipId is required");
        }

        TenantMembership membership = tenantMembershipRepository.findByIdAndTenantId(membershipId, tenantId)
                .orElseThrow(() -> new NoSuchElementException("membership not found"));

        String role = normalizeOptionalMembershipRole(request == null ? null : request.role());
        String status = normalizeOptionalMembershipStatus(request == null ? null : request.status());
        if (role == null && status == null) {
            throw new IllegalArgumentException("at least one updatable field is required");
        }

        String nextRole = role == null ? membership.getRole() : role;
        String nextStatus = status == null ? membership.getStatus() : status;
        if (isActiveOwner(membership.getRole(), membership.getStatus()) && !isActiveOwner(nextRole, nextStatus)) {
            ensureTenantHasAnotherActiveOwner(tenantId);
        }

        Instant now = Instant.now();
        if (role != null) {
            membership.setRole(role);
        }
        if (status != null) {
            membership.setStatus(status);
        }
        membership.setUpdatedAt(now);
        tenantMembershipRepository.save(membership);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("membershipId", membership.getId().toString());
        metadata.put("role", membership.getRole());
        metadata.put("status", membership.getStatus());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_MEMBER_UPDATED,
                AUDIT_ENTITY_TENANT_MEMBERSHIP,
                membership.getId().toString(),
                metadata,
                now,
                actorUserId
        );

        return toMemberResponse(membership);
    }

    @Transactional
    public void removeMember(UUID tenantId, UUID membershipId) {
        removeMember(tenantId, membershipId, null);
    }

    @Transactional
    public void removeMember(UUID tenantId, UUID membershipId, UUID actorUserId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
        if (membershipId == null) {
            throw new IllegalArgumentException("membershipId is required");
        }

        TenantMembership membership = tenantMembershipRepository.findByIdAndTenantId(membershipId, tenantId)
                .orElseThrow(() -> new NoSuchElementException("membership not found"));

        TenantUser memberUser = membership.getUser();
        String memberEmail = memberUser == null ? null : memberUser.getEmail();
        String memberRole = membership.getRole();
        String memberStatus = membership.getStatus();
        if (isActiveOwner(memberRole, memberStatus)) {
            ensureTenantHasAnotherActiveOwner(tenantId);
        }

        Instant now = Instant.now();
        tenantMembershipRepository.delete(membership);

        tenantRepository.findById(tenantId).ifPresent(tenant -> {
            tenant.setUpdatedAt(now);
            tenantRepository.save(tenant);
        });

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("membershipId", membershipId.toString());
        if (memberEmail == null) {
            metadata.putNull("email");
        } else {
            metadata.put("email", memberEmail);
        }
        metadata.put("role", memberRole);
        metadata.put("status", memberStatus);
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_MEMBER_REMOVED,
                AUDIT_ENTITY_TENANT_MEMBERSHIP,
                membershipId.toString(),
                metadata,
                now,
                actorUserId
        );
    }

    @Transactional(readOnly = true)
    public List<TenantMemberResponse> listMembers(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
        return tenantMembershipRepository.findByTenantIdOrderByCreatedAtAsc(tenantId).stream()
                .map(TenantService::toMemberResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TenantAuditEventResponse> listTenantAuditEvents(UUID tenantId, Integer limit) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        int resolvedLimit = resolveAuditLimit(limit);
        PageRequest pageRequest = PageRequest.of(
                0,
                resolvedLimit,
                Sort.by(Sort.Order.desc("eventTime"), Sort.Order.desc("createdAt"))
        );

        return tenantAuditEventRepository.findByTenantId(tenantId, pageRequest).stream()
                .map(this::toAuditEventResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse getTenantSubscription(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
        return tenantSubscriptionRepository.findByTenantId(tenantId)
                .map(TenantService::toSubscriptionResponse)
                .orElseGet(() -> new TenantSubscriptionResponse(
                        tenantId,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ));
    }

    @Transactional
    public TenantSubscriptionResponse updateTenantSubscription(UUID tenantId, UpdateTenantSubscriptionRequest request) {
        return updateTenantSubscription(tenantId, request, null);
    }

    @Transactional
    public TenantSubscriptionResponse updateTenantSubscription(UUID tenantId,
                                                               UpdateTenantSubscriptionRequest request,
                                                               UUID actorUserId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String planCode = normalizePlanCode(request == null ? null : request.planCode());
        String status = normalizeSubscriptionStatus(request == null ? null : request.status());
        String billingCycle = normalizeBillingCycle(request == null ? null : request.billingCycle());
        Instant trialEndsAt = request == null ? null : request.trialEndsAt();
        Instant currentPeriodStartsAt = request == null ? null : request.currentPeriodStartsAt();
        Instant currentPeriodEndsAt = request == null ? null : request.currentPeriodEndsAt();
        validateSubscriptionPeriod(currentPeriodStartsAt, currentPeriodEndsAt);

        Instant now = Instant.now();
        TenantSubscription subscription = tenantSubscriptionRepository.findByTenantId(tenantId).orElseGet(() -> {
            TenantSubscription created = new TenantSubscription();
            created.setId(UUID.randomUUID());
            created.setTenantId(tenantId);
            created.setCreatedAt(now);
            return created;
        });

        if (subscription.getId() == null) {
            subscription.setId(UUID.randomUUID());
        }
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(now);
        }
        subscription.setPlanCode(planCode);
        subscription.setStatus(status);
        subscription.setBillingCycle(billingCycle);
        subscription.setTrialEndsAt(trialEndsAt);
        subscription.setCurrentPeriodStartsAt(currentPeriodStartsAt);
        subscription.setCurrentPeriodEndsAt(currentPeriodEndsAt);
        subscription.setUpdatedAt(now);
        tenantSubscriptionRepository.save(subscription);

        tenantRepository.findById(tenantId).ifPresent(tenant -> {
            tenant.setUpdatedAt(now);
            tenantRepository.save(tenant);
        });

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("planCode", planCode);
        metadata.put("status", status);
        metadata.put("billingCycle", billingCycle);
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_SUBSCRIPTION_UPDATED,
                AUDIT_ENTITY_TENANT_SUBSCRIPTION,
                subscription.getId().toString(),
                metadata,
                now,
                actorUserId
        );

        return toSubscriptionResponse(subscription);
    }

    @Transactional
    public TenantUsageEventResponse createTenantUsageEvent(UUID tenantId, CreateTenantUsageEventRequest request) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String eventType = normalizeUsageEventType(request == null ? null : request.eventType());
        long eventValue = normalizeUsageEventValue(request == null ? null : request.eventValue());
        Instant now = Instant.now();
        Instant eventTime = request == null || request.eventTime() == null ? now : request.eventTime();
        JsonNode metadata = normalizeUsageMetadata(request == null ? null : request.metadata());

        TenantUsageEvent event = new TenantUsageEvent();
        event.setId(UUID.randomUUID());
        event.setTenantId(tenantId);
        event.setEventType(eventType);
        event.setEventValue(eventValue);
        event.setEventTime(eventTime);
        event.setMetadataJson(metadata == null ? null : writeSettingsJson(metadata));
        event.setCreatedAt(now);
        tenantUsageEventRepository.save(event);

        return toUsageEventResponse(event);
    }

    @Transactional(readOnly = true)
    public List<TenantUsageEventResponse> listTenantUsageEvents(UUID tenantId, String eventType, Integer limit) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        int resolvedLimit = resolveUsageLimit(limit);
        PageRequest pageRequest = PageRequest.of(
                0,
                resolvedLimit,
                Sort.by(Sort.Order.desc("eventTime"), Sort.Order.desc("createdAt"))
        );

        String normalizedType = normalizeUsageEventTypeFilter(eventType);
        List<TenantUsageEvent> events = normalizedType == null
                ? tenantUsageEventRepository.findByTenantId(tenantId, pageRequest)
                : tenantUsageEventRepository.findByTenantIdAndEventType(tenantId, normalizedType, pageRequest);

        return events.stream()
                .map(this::toUsageEventResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TenantUsageSummaryResponse> getTenantUsageSummary(UUID tenantId,
                                                                  String eventType,
                                                                  String from,
                                                                  String to) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String normalizedEventType = normalizeUsageEventTypeFilter(eventType);
        Instant fromInclusive = parseOptionalInstant(from, "from");
        Instant toInclusive = parseOptionalInstant(to, "to");
        if (fromInclusive != null && toInclusive != null && fromInclusive.isAfter(toInclusive)) {
            throw new IllegalArgumentException("from must be less than or equal to to");
        }

        return tenantUsageEventRepository.summarizeByTenantId(tenantId, fromInclusive, toInclusive, normalizedEventType)
                .stream()
                .map(row -> new TenantUsageSummaryResponse(
                        tenantId,
                        row.eventType(),
                        row.totalValue(),
                        row.eventCount(),
                        row.firstEventTime(),
                        row.lastEventTime()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantSettingsResponse getTenantSettings(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
        TenantSettings settings = tenantSettingsRepository.findById(tenantId).orElse(null);
        if (settings == null) {
            return new TenantSettingsResponse(tenantId, defaultSettingsNode(), null);
        }
        return new TenantSettingsResponse(
                tenantId,
                parseSettingsJson(settings.getSettingsJson()),
                settings.getUpdatedAt()
        );
    }

    @Transactional
    public TenantSettingsResponse updateTenantSettings(UUID tenantId, UpdateTenantSettingsRequest request) {
        return updateTenantSettings(tenantId, request, null);
    }

    @Transactional
    public TenantSettingsResponse updateTenantSettings(UUID tenantId,
                                                       UpdateTenantSettingsRequest request,
                                                       UUID actorUserId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        JsonNode settingsNode = request == null ? null : request.settings();
        ObjectNode normalizedSettings = normalizeAndValidateSettings(settingsNode);

        Instant now = Instant.now();
        TenantSettings settings = tenantSettingsRepository.findById(tenantId).orElseGet(() -> {
            TenantSettings created = new TenantSettings();
            created.setTenantId(tenantId);
            created.setCreatedAt(now);
            return created;
        });
        settings.setSettingsJson(writeSettingsJson(normalizedSettings));
        settings.setUpdatedAt(now);
        tenantSettingsRepository.save(settings);

        tenantRepository.findById(tenantId).ifPresent(tenant -> {
            tenant.setUpdatedAt(now);
            tenantRepository.save(tenant);
        });

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("schemaVersion", SETTINGS_SCHEMA_VERSION);
        metadata.put("theme", normalizedSettings.path("theme").asText(DEFAULT_THEME));
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_SETTINGS_UPDATED,
                AUDIT_ENTITY_TENANT_SETTINGS,
                tenantId.toString(),
                metadata,
                now,
                actorUserId
        );

        return new TenantSettingsResponse(tenantId, normalizedSettings, settings.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public TenantSettingsResponse getTenantSettingsForMember(String userEmail, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        String email = normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        requireActiveMembership(tenantId, user.getId());
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        ensureTenantIsActive(tenant);
        return getTenantSettings(tenantId);
    }

    @Transactional(readOnly = true)
    public TenantBrandingRuntimeResponse getTenantBrandingForMember(String userEmail, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }

        String email = normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        requireActiveMembership(tenantId, user.getId());

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        ensureTenantIsActive(tenant);
        TenantBranding branding = tenantBrandingRepository.findById(tenantId).orElseGet(() -> defaultBranding(tenant));

        return new TenantBrandingRuntimeResponse(
                tenantId,
                new TenantBrandingResponse(
                        branding.getAppName(),
                        branding.getLogoUrl(),
                        branding.getPrimaryColor(),
                        branding.getSecondaryColor()
                ),
                branding.getUpdatedAt() == null ? tenant.getUpdatedAt() : branding.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse getTenantSubscriptionForMember(String userEmail, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        String email = normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        requireActiveMembership(tenantId, user.getId());
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        ensureTenantIsActive(tenant);
        return getTenantSubscription(tenantId);
    }

    @Transactional(readOnly = true)
    public MeResponse getMe(String userEmail, UUID requestedTenantId) {
        String email = normalizeEmail(userEmail);
        TenantUser user = tenantUserRepository.findByEmail(email)
                .orElseThrow(() -> new NoSuchElementException("user not found"));

        List<TenantMembership> memberships = tenantMembershipRepository.findByUserIdOrderByCreatedAtAsc(user.getId());
        if (memberships.isEmpty()) {
            throw new NoSuchElementException("membership not found");
        }

        Set<UUID> tenantIds = memberships.stream()
                .map(TenantMembership::getTenantId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Tenant> tenantsById = tenantRepository.findAllById(tenantIds).stream()
                .collect(Collectors.toMap(Tenant::getId, Function.identity()));

        List<MeTenantAccessResponse> membershipResponses = memberships.stream()
                .map(membership -> toMeTenantAccessResponse(membership, tenantsById))
                .toList();

        String selectedRole = null;
        if (requestedTenantId != null) {
            TenantMembership selectedMembership = memberships.stream()
                    .filter(membership -> membership.getTenantId().equals(requestedTenantId))
                    .findFirst()
                    .orElseThrow(() -> new ForbiddenTenantAccessException("user is not a member of requested tenant"));
            if (!STATUS_ACTIVE.equals(selectedMembership.getStatus())) {
                throw new ForbiddenTenantAccessException("user is not an active member of requested tenant");
            }
            Tenant selectedTenant = tenantsById.get(requestedTenantId);
            if (selectedTenant == null) {
                throw new NoSuchElementException("tenant not found");
            }
            ensureTenantIsActive(selectedTenant);
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

    private static TenantBranding defaultBranding(Tenant tenant) {
        TenantBranding branding = new TenantBranding();
        branding.setTenantId(tenant.getId());
        branding.setAppName(tenant.getName());
        branding.setPrimaryColor("#1E293B");
        branding.setSecondaryColor("#0EA5E9");
        return branding;
    }

    private static TenantDetailResponse toDetail(Tenant tenant, TenantBranding branding) {
        return new TenantDetailResponse(
                tenant.getId(),
                tenant.getSlug(),
                tenant.getName(),
                tenant.getLegalEntityName(),
                tenant.getBillingEmail(),
                tenant.getStatus(),
                tenant.getCreatedAt(),
                tenant.getUpdatedAt(),
                new TenantBrandingResponse(
                        branding.getAppName(),
                        branding.getLogoUrl(),
                        branding.getPrimaryColor(),
                        branding.getSecondaryColor()
                )
        );
    }

    private static TenantMemberResponse toMemberResponse(TenantMembership membership) {
        TenantUser user = membership.getUser();
        return new TenantMemberResponse(
                membership.getId(),
                membership.getTenantId(),
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                membership.getRole(),
                membership.getStatus(),
                membership.getCreatedAt()
        );
    }

    private TenantAuditEventResponse toAuditEventResponse(TenantAuditEvent event) {
        return new TenantAuditEventResponse(
                event.getId(),
                event.getTenantId(),
                event.getActorUserId(),
                event.getAction(),
                event.getEntityType(),
                event.getEntityId(),
                parseAuditMetadataJson(event.getMetadataJson()),
                event.getEventTime(),
                event.getCreatedAt()
        );
    }

    private static TenantSubscriptionResponse toSubscriptionResponse(TenantSubscription subscription) {
        return new TenantSubscriptionResponse(
                subscription.getTenantId(),
                subscription.getPlanCode(),
                subscription.getStatus(),
                subscription.getBillingCycle(),
                subscription.getTrialEndsAt(),
                subscription.getCurrentPeriodStartsAt(),
                subscription.getCurrentPeriodEndsAt(),
                subscription.getUpdatedAt()
        );
    }

    private TenantUsageEventResponse toUsageEventResponse(TenantUsageEvent event) {
        return new TenantUsageEventResponse(
                event.getId(),
                event.getTenantId(),
                event.getEventType(),
                event.getEventValue(),
                event.getEventTime(),
                parseUsageMetadataJson(event.getMetadataJson()),
                event.getCreatedAt()
        );
    }

    private static MeTenantAccessResponse toMeTenantAccessResponse(TenantMembership membership, Map<UUID, Tenant> tenantsById) {
        Tenant tenant = tenantsById.get(membership.getTenantId());
        if (tenant == null) {
            throw new NoSuchElementException("tenant not found");
        }
        return new MeTenantAccessResponse(
                tenant.getId(),
                tenant.getSlug(),
                tenant.getName(),
                membership.getRole(),
                membership.getStatus()
        );
    }

    private static String normalizeRequired(String value, String fieldName, int maxLength) {
        String normalized = normalizeOptional(value, maxLength);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return normalized;
    }

    private static String normalizeOptional(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException("value exceeds max length");
        }
        return normalized;
    }

    private static String normalizeEmail(String email) {
        String normalized = normalizeRequired(email, "email", 320).toLowerCase(Locale.ROOT);
        if (!normalized.contains("@") || normalized.startsWith("@") || normalized.endsWith("@")) {
            throw new IllegalArgumentException("email must be a valid address");
        }
        return normalized;
    }

    private static String normalizeTenantStatus(String status) {
        String normalized = normalizeRequired(status, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_TENANT_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: active, suspended");
        }
        return normalized;
    }

    private static String normalizeOptionalTenantStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return normalizeTenantStatus(status);
    }

    private static String normalizeMembershipRole(String role) {
        String normalized = normalizeRequired(role, "role", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_MEMBERSHIP_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("role must be one of: owner, admin, editor, viewer");
        }
        return normalized;
    }

    private static String normalizeOptionalMembershipRole(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        return normalizeMembershipRole(role);
    }

    private static String normalizeOptionalMembershipStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = normalizeRequired(status, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_MEMBERSHIP_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: " + STATUS_ACTIVE + ", " + STATUS_SUSPENDED);
        }
        return normalized;
    }

    private static boolean isActiveOwner(String role, String status) {
        return ROLE_OWNER.equals(role) && STATUS_ACTIVE.equals(status);
    }

    private TenantMembership requireActiveMembership(UUID tenantId, UUID userId) {
        TenantMembership membership = tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .orElseThrow(() -> new ForbiddenTenantAccessException("user is not an active member of requested tenant"));
        if (!STATUS_ACTIVE.equals(membership.getStatus())) {
            throw new ForbiddenTenantAccessException("user is not an active member of requested tenant");
        }
        return membership;
    }

    private static void ensureTenantIsActive(Tenant tenant) {
        if (!STATUS_ACTIVE.equals(tenant.getStatus())) {
            throw new ForbiddenTenantAccessException("requested tenant is not active");
        }
    }

    private void ensureTenantHasAnotherActiveOwner(UUID tenantId) {
        long activeOwners = tenantMembershipRepository.countByTenantIdAndRoleAndStatus(tenantId, ROLE_OWNER, STATUS_ACTIVE);
        if (activeOwners <= 1) {
            throw new LastOwnerProtectionException("tenant must have at least one active owner");
        }
    }

    private static String normalizePlanCode(String planCode) {
        String normalized = normalizeRequired(planCode, "planCode", 64).toLowerCase(Locale.ROOT);
        if (!PLAN_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("planCode must match [a-z0-9._-]{2,64}");
        }
        return normalized;
    }

    private static String normalizeSubscriptionStatus(String status) {
        String normalized = normalizeRequired(status, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_SUBSCRIPTION_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: trialing, active, past_due, canceled");
        }
        return normalized;
    }

    private static String normalizeBillingCycle(String billingCycle) {
        String normalized = normalizeRequired(billingCycle, "billingCycle", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_BILLING_CYCLES.contains(normalized)) {
            throw new IllegalArgumentException("billingCycle must be one of: monthly, annual");
        }
        return normalized;
    }

    private static void validateSubscriptionPeriod(Instant currentPeriodStartsAt, Instant currentPeriodEndsAt) {
        if (currentPeriodStartsAt != null && currentPeriodEndsAt != null && !currentPeriodEndsAt.isAfter(currentPeriodStartsAt)) {
            throw new IllegalArgumentException("currentPeriodEndsAt must be after currentPeriodStartsAt");
        }
    }

    private static String normalizeUsageEventType(String eventType) {
        String normalized = normalizeRequired(eventType, "eventType", 64).toLowerCase(Locale.ROOT);
        if (!PLAN_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("eventType must match [a-z0-9._-]{2,64}");
        }
        return normalized;
    }

    private static String normalizeUsageEventTypeFilter(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return null;
        }
        return normalizeUsageEventType(eventType);
    }

    private static Instant parseOptionalInstant(String value, String fieldName) {
        String normalized = normalizeOptional(value, 128);
        if (normalized == null) {
            return null;
        }
        try {
            return Instant.parse(normalized);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(fieldName + " must be an ISO-8601 timestamp", ex);
        }
    }

    private static long normalizeUsageEventValue(Long eventValue) {
        if (eventValue == null) {
            throw new IllegalArgumentException("eventValue is required");
        }
        if (eventValue < 0) {
            throw new IllegalArgumentException("eventValue must be >= 0");
        }
        return eventValue;
    }

    private static JsonNode normalizeUsageMetadata(JsonNode metadata) {
        if (metadata == null || metadata.isNull()) {
            return null;
        }
        if (!(metadata instanceof ObjectNode)) {
            throw new IllegalArgumentException("metadata must be a JSON object");
        }
        return metadata;
    }

    private static String normalizeColor(String value, String fieldName) {
        String normalized = normalizeOptional(value, 16);
        if (normalized == null) {
            return null;
        }
        if (!HEX_COLOR_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(fieldName + " must match #RRGGBB");
        }
        return normalized.toUpperCase(Locale.ROOT);
    }

    private static String normalizeSlug(String requestedSlug, String fallbackName) {
        String candidate = normalizeOptional(requestedSlug, 80);
        if (candidate == null) {
            candidate = fallbackName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        }
        candidate = candidate.toLowerCase(Locale.ROOT).replaceAll("^-+|-+$", "");
        if (!SLUG_PATTERN.matcher(candidate).matches()) {
            throw new IllegalArgumentException("slug must match [a-z0-9-]{3,63}");
        }
        return candidate;
    }

    private static int resolveAuditLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_AUDIT_LIMIT;
        }
        if (limit < 1 || limit > MAX_AUDIT_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_AUDIT_LIMIT);
        }
        return limit;
    }

    private static int resolveUsageLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_USAGE_LIMIT;
        }
        if (limit < 1 || limit > MAX_USAGE_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_USAGE_LIMIT);
        }
        return limit;
    }

    private JsonNode parseSettingsJson(String settingsJson) {
        if (settingsJson == null || settingsJson.isBlank()) {
            return defaultSettingsNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(settingsJson);
            return normalizeAndValidateSettings(parsed);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("stored settings_json is invalid", ex);
        }
    }

    private JsonNode parseAuditMetadataJson(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(metadataJson);
            if (parsed == null || parsed.isNull()) {
                return objectMapper.createObjectNode();
            }
            return parsed;
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("stored audit metadata_json is invalid", ex);
        }
    }

    private JsonNode parseUsageMetadataJson(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(metadataJson);
            if (parsed == null || parsed.isNull()) {
                return objectMapper.createObjectNode();
            }
            return parsed;
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("stored usage metadata_json is invalid", ex);
        }
    }

    private String writeSettingsJson(JsonNode settingsNode) {
        try {
            return objectMapper.writeValueAsString(settingsNode);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("settings payload is not serializable", ex);
        }
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
        event.setMetadataJson(writeSettingsJson(metadata));
        event.setEventTime(eventTime);
        event.setCreatedAt(eventTime);
        tenantAuditEventRepository.save(event);
    }

    private ObjectNode defaultSettingsNode() {
        ObjectNode game = objectMapper.createObjectNode();
        game.put("maxPlayers", DEFAULT_MAX_PLAYERS);
        game.put("roundsPerMatch", DEFAULT_ROUNDS_PER_MATCH);

        ObjectNode features = objectMapper.createObjectNode();
        features.put("leaderboardEnabled", DEFAULT_LEADERBOARD_ENABLED);
        features.put("teamsEnabled", DEFAULT_TEAMS_ENABLED);

        ObjectNode root = objectMapper.createObjectNode();
        root.put("schemaVersion", SETTINGS_SCHEMA_VERSION);
        root.put("theme", DEFAULT_THEME);
        root.set("game", game);
        root.set("features", features);
        return root;
    }

    private ObjectNode normalizeAndValidateSettings(JsonNode settingsNode) {
        if (!(settingsNode instanceof ObjectNode root)) {
            throw new IllegalArgumentException("settings must be a JSON object");
        }

        ensureNoUnknownKeys(root, ALLOWED_SETTINGS_KEYS, "settings");

        int schemaVersion = readRequiredInt(root, "schemaVersion");
        if (schemaVersion != SETTINGS_SCHEMA_VERSION) {
            throw new IllegalArgumentException("schemaVersion must be " + SETTINGS_SCHEMA_VERSION);
        }

        String theme = readOptionalTheme(root);

        ObjectNode gameSource = readOptionalObject(root, "game");
        if (gameSource != null) {
            ensureNoUnknownKeys(gameSource, ALLOWED_GAME_SETTINGS_KEYS, "settings.game");
        }
        int maxPlayers = readOptionalInt(gameSource, "maxPlayers", DEFAULT_MAX_PLAYERS, 1, 50);
        int roundsPerMatch = readOptionalInt(gameSource, "roundsPerMatch", DEFAULT_ROUNDS_PER_MATCH, 1, 30);

        ObjectNode featuresSource = readOptionalObject(root, "features");
        if (featuresSource != null) {
            ensureNoUnknownKeys(featuresSource, ALLOWED_FEATURE_SETTINGS_KEYS, "settings.features");
        }
        boolean leaderboardEnabled = readOptionalBoolean(featuresSource, "leaderboardEnabled", DEFAULT_LEADERBOARD_ENABLED);
        boolean teamsEnabled = readOptionalBoolean(featuresSource, "teamsEnabled", DEFAULT_TEAMS_ENABLED);

        ObjectNode normalizedGame = objectMapper.createObjectNode();
        normalizedGame.put("maxPlayers", maxPlayers);
        normalizedGame.put("roundsPerMatch", roundsPerMatch);

        ObjectNode normalizedFeatures = objectMapper.createObjectNode();
        normalizedFeatures.put("leaderboardEnabled", leaderboardEnabled);
        normalizedFeatures.put("teamsEnabled", teamsEnabled);

        ObjectNode normalizedRoot = objectMapper.createObjectNode();
        normalizedRoot.put("schemaVersion", SETTINGS_SCHEMA_VERSION);
        normalizedRoot.put("theme", theme);
        normalizedRoot.set("game", normalizedGame);
        normalizedRoot.set("features", normalizedFeatures);
        return normalizedRoot;
    }

    private static void ensureNoUnknownKeys(ObjectNode objectNode, Set<String> allowedKeys, String fieldName) {
        for (Iterator<String> it = objectNode.fieldNames(); it.hasNext(); ) {
            String key = it.next();
            if (!allowedKeys.contains(key)) {
                throw new IllegalArgumentException(fieldName + " contains unsupported key: " + key);
            }
        }
    }

    private static int readRequiredInt(ObjectNode objectNode, String fieldName) {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        if (!valueNode.canConvertToInt()) {
            throw new IllegalArgumentException(fieldName + " must be an integer");
        }
        return valueNode.intValue();
    }

    private static ObjectNode readOptionalObject(ObjectNode objectNode, String fieldName) {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return null;
        }
        if (!(valueNode instanceof ObjectNode nestedObject)) {
            throw new IllegalArgumentException(fieldName + " must be a JSON object");
        }
        return nestedObject;
    }

    private static int readOptionalInt(ObjectNode objectNode, String fieldName, int defaultValue, int min, int max) {
        if (objectNode == null) {
            return defaultValue;
        }
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return defaultValue;
        }
        if (!valueNode.canConvertToInt()) {
            throw new IllegalArgumentException(fieldName + " must be an integer");
        }
        int value = valueNode.intValue();
        if (value < min || value > max) {
            throw new IllegalArgumentException(fieldName + " must be between " + min + " and " + max);
        }
        return value;
    }

    private static boolean readOptionalBoolean(ObjectNode objectNode, String fieldName, boolean defaultValue) {
        if (objectNode == null) {
            return defaultValue;
        }
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return defaultValue;
        }
        if (!valueNode.isBoolean()) {
            throw new IllegalArgumentException(fieldName + " must be a boolean");
        }
        return valueNode.booleanValue();
    }

    private static String readOptionalTheme(ObjectNode root) {
        JsonNode themeNode = root.get("theme");
        String theme = themeNode == null || themeNode.isNull()
                ? DEFAULT_THEME
                : themeNode.asText("").trim().toLowerCase(Locale.ROOT);
        if (theme.isEmpty()) {
            theme = DEFAULT_THEME;
        }
        if (!ALLOWED_THEMES.contains(theme)) {
            throw new IllegalArgumentException("theme must be one of: classic, ember, ocean");
        }
        return theme;
    }
}
