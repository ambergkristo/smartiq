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
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class TenantAdminService {

    private static final String AUTH_PROVIDER_MANUAL = "manual";
    private static final String AUDIT_ACTION_TENANT_CREATED = "TENANT_CREATED";
    private static final String AUDIT_ACTION_TENANT_BRANDING_UPDATED = "TENANT_BRANDING_UPDATED";
    private static final String AUDIT_ACTION_TENANT_STATUS_UPDATED = "TENANT_STATUS_UPDATED";
    private static final String AUDIT_ACTION_TENANT_MEMBER_ADDED = "TENANT_MEMBER_ADDED";
    private static final String AUDIT_ACTION_TENANT_MEMBER_UPDATED = "TENANT_MEMBER_UPDATED";
    private static final String AUDIT_ACTION_TENANT_MEMBER_REMOVED = "TENANT_MEMBER_REMOVED";
    private static final String AUDIT_ENTITY_TENANT = "tenant";
    private static final String AUDIT_ENTITY_TENANT_BRANDING = "tenant_branding";
    private static final String AUDIT_ENTITY_TENANT_MEMBERSHIP = "tenant_membership";

    private final TenantRepository tenantRepository;
    private final TenantBrandingRepository tenantBrandingRepository;
    private final TenantAuditEventRepository tenantAuditEventRepository;
    private final TenantUserRepository tenantUserRepository;
    private final TenantMembershipRepository tenantMembershipRepository;
    private final ObjectMapper objectMapper;

    public TenantAdminService(TenantRepository tenantRepository,
                              TenantBrandingRepository tenantBrandingRepository,
                              TenantAuditEventRepository tenantAuditEventRepository,
                              TenantUserRepository tenantUserRepository,
                              TenantMembershipRepository tenantMembershipRepository,
                              ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantBrandingRepository = tenantBrandingRepository;
        this.tenantAuditEventRepository = tenantAuditEventRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.tenantMembershipRepository = tenantMembershipRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TenantDetailResponse createTenant(CreateTenantRequest request, UUID actorUserId) {
        String name = TenantDomainSupport.normalizeRequired(request == null ? null : request.name(), "name", 160);
        String slug = TenantDomainSupport.normalizeSlug(request == null ? null : request.slug(), name);
        if (tenantRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("tenant slug already exists");
        }

        String legalEntityName = TenantDomainSupport.normalizeOptional(request == null ? null : request.legalEntityName(), 200);
        String billingEmail = TenantDomainSupport.normalizeOptional(request == null ? null : request.billingEmail(), 320);

        Instant now = Instant.now();
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setSlug(slug);
        tenant.setName(name);
        tenant.setLegalEntityName(legalEntityName);
        tenant.setBillingEmail(billingEmail);
        tenant.setStatus(TenantDomainSupport.STATUS_ACTIVE);
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

        return TenantDomainSupport.toDetail(tenant, branding);
    }

    @Transactional(readOnly = true)
    public String generateUniqueOnboardingSlug(String workspaceName) {
        String baseSlug = TenantDomainSupport.normalizeSlug(null, workspaceName);
        String candidate = baseSlug;
        int suffix = 2;
        while (tenantRepository.existsBySlug(candidate)) {
            String nextCandidate = baseSlug;
            String suffixText = "-" + suffix;
            int maxBaseLength = 63 - suffixText.length();
            if (nextCandidate.length() > maxBaseLength) {
                nextCandidate = nextCandidate.substring(0, maxBaseLength).replaceAll("-+$", "");
            }
            candidate = nextCandidate + suffixText;
            suffix += 1;
        }
        return candidate;
    }

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> listTenants(String statusFilter, String query) {
        String normalizedStatus = TenantDomainSupport.normalizeOptionalTenantStatus(statusFilter);
        String normalizedQuery = TenantDomainSupport.normalizeOptional(query, 160);
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
        TenantBranding branding = tenantBrandingRepository.findById(tenantId)
                .orElseGet(() -> TenantDomainSupport.defaultBranding(tenant));
        return TenantDomainSupport.toDetail(tenant, branding);
    }

    @Transactional
    public TenantDetailResponse updateTenantStatus(UUID tenantId, UpdateTenantStatusRequest request, UUID actorUserId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        TenantBranding branding = tenantBrandingRepository.findById(tenantId)
                .orElseGet(() -> TenantDomainSupport.defaultBranding(tenant));

        String status = TenantDomainSupport.normalizeTenantStatus(request == null ? null : request.status());
        if (status.equals(tenant.getStatus())) {
            return TenantDomainSupport.toDetail(tenant, branding);
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

        return TenantDomainSupport.toDetail(tenant, branding);
    }

    @Transactional
    public TenantDetailResponse updateBranding(UUID tenantId, UpdateTenantBrandingRequest request, UUID actorUserId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));

        TenantBranding branding = tenantBrandingRepository.findById(tenantId)
                .orElseGet(() -> TenantDomainSupport.defaultBranding(tenant));
        Instant now = Instant.now();
        if (branding.getCreatedAt() == null) {
            branding.setCreatedAt(now);
        }

        String appName = TenantDomainSupport.normalizeRequired(request == null ? null : request.appName(), "appName", 160);
        String logoUrl = TenantDomainSupport.normalizeOptional(request == null ? null : request.logoUrl(), 1024);
        String primaryColor = TenantDomainSupport.normalizeColor(request == null ? null : request.primaryColor(), "primaryColor");
        String secondaryColor = TenantDomainSupport.normalizeColor(request == null ? null : request.secondaryColor(), "secondaryColor");

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

        return TenantDomainSupport.toDetail(tenant, branding);
    }

    @Transactional
    public TenantMemberResponse addMember(UUID tenantId, AddTenantMemberRequest request, UUID actorUserId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String email = TenantDomainSupport.normalizeEmail(request == null ? null : request.email());
        String displayName = TenantDomainSupport.normalizeOptional(request == null ? null : request.displayName(), 160);
        String role = TenantDomainSupport.normalizeMembershipRole(request == null ? null : request.role());
        Instant now = Instant.now();

        TenantUser user = tenantUserRepository.findByEmail(email).orElseGet(() -> {
            TenantUser created = new TenantUser();
            created.setId(UUID.randomUUID());
            created.setEmail(email);
            created.setDisplayName(displayName);
            created.setAuthProvider(AUTH_PROVIDER_MANUAL);
            created.setExternalSubject(null);
            created.setStatus(TenantDomainSupport.STATUS_ACTIVE);
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
        membership.setStatus(TenantDomainSupport.STATUS_ACTIVE);
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

        return TenantDomainSupport.toMemberResponse(membership);
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

        String role = TenantDomainSupport.normalizeOptionalMembershipRole(request == null ? null : request.role());
        String status = TenantDomainSupport.normalizeOptionalMembershipStatus(request == null ? null : request.status());
        if (role == null && status == null) {
            throw new IllegalArgumentException("at least one updatable field is required");
        }

        String nextRole = role == null ? membership.getRole() : role;
        String nextStatus = status == null ? membership.getStatus() : status;
        if (TenantDomainSupport.isActiveOwner(membership.getRole(), membership.getStatus())
                && !TenantDomainSupport.isActiveOwner(nextRole, nextStatus)) {
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

        return TenantDomainSupport.toMemberResponse(membership);
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
        if (TenantDomainSupport.isActiveOwner(memberRole, memberStatus)) {
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
                .map(TenantDomainSupport::toMemberResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TenantAuditEventResponse> listTenantAuditEvents(UUID tenantId, Integer limit) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        int resolvedLimit = TenantDomainSupport.resolveAuditLimit(limit);
        PageRequest pageRequest = PageRequest.of(
                0,
                resolvedLimit,
                Sort.by(Sort.Order.desc("eventTime"), Sort.Order.desc("createdAt"))
        );

        return tenantAuditEventRepository.findByTenantId(tenantId, pageRequest).stream()
                .map(this::toAuditEventResponse)
                .toList();
    }

    private void ensureTenantHasAnotherActiveOwner(UUID tenantId) {
        long activeOwners = tenantMembershipRepository.countByTenantIdAndRoleAndStatus(
                tenantId,
                TenantDomainSupport.ROLE_OWNER,
                TenantDomainSupport.STATUS_ACTIVE
        );
        if (activeOwners <= 1) {
            throw new LastOwnerProtectionException("tenant must have at least one active owner");
        }
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

    private String writeSettingsJson(JsonNode settingsNode) {
        try {
            return objectMapper.writeValueAsString(settingsNode);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("settings payload could not be serialized", ex);
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
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setActorUserId(actorUserId);
        event.setEventTime(eventTime);
        event.setMetadataJson(writeSettingsJson(metadata));
        event.setCreatedAt(Instant.now());
        tenantAuditEventRepository.save(event);
    }
}
