package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smartiq.backend.shared.RuntimeLimits;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

final class TenantDomainSupport {

    static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9-]{3,63}$");
    static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9A-Fa-f]{6}$");
    static final Pattern PLAN_CODE_PATTERN = Pattern.compile("^[a-z0-9._-]{2,64}$");
    static final Set<String> ALLOWED_TENANT_STATUSES = Set.of("active", "suspended");
    static final Set<String> ALLOWED_MEMBERSHIP_ROLES = Set.of("owner", "admin", "editor", "viewer");
    static final Set<String> ALLOWED_MEMBERSHIP_STATUSES = Set.of("active", "suspended");
    static final Set<String> ALLOWED_SUBSCRIPTION_STATUSES = Set.of("trialing", "active", "past_due", "canceled");
    static final Set<String> ALLOWED_BILLING_CYCLES = Set.of("monthly", "annual");
    static final String STATUS_ACTIVE = "active";
    static final String STATUS_SUSPENDED = "suspended";
    static final String SUBSCRIPTION_STATUS_TRIALING = "trialing";
    static final String SUBSCRIPTION_STATUS_ACTIVE = "active";
    static final String ROLE_OWNER = "owner";
    static final String ROLE_ADMIN = "admin";
    static final long PLAN_LIMIT_STARTER = 1_000L;
    static final long PLAN_LIMIT_PILOT = 2_000L;
    static final long PLAN_LIMIT_GROWTH = 10_000L;
    static final int DEFAULT_AUDIT_LIMIT = 50;
    static final int MAX_AUDIT_LIMIT = 200;
    static final int DEFAULT_USAGE_LIMIT = 100;
    static final int MAX_USAGE_LIMIT = 500;

    private TenantDomainSupport() {
    }

    static String normalizeRequired(String value, String fieldName, int maxLength) {
        String normalized = normalizeOptional(value, maxLength);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return normalized;
    }

    static String normalizeOptional(String value, int maxLength) {
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

    static String normalizeEmail(String email) {
        String normalized = normalizeRequired(email, "email", 320).toLowerCase(Locale.ROOT);
        if (!normalized.contains("@") || normalized.startsWith("@") || normalized.endsWith("@")) {
            throw new IllegalArgumentException("email must be a valid address");
        }
        return normalized;
    }

    static String normalizeTenantStatus(String status) {
        String normalized = normalizeRequired(status, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_TENANT_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: active, suspended");
        }
        return normalized;
    }

    static String normalizeOptionalTenantStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return normalizeTenantStatus(status);
    }

    static String normalizeMembershipRole(String role) {
        String normalized = normalizeRequired(role, "role", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_MEMBERSHIP_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("role must be one of: owner, admin, editor, viewer");
        }
        return normalized;
    }

    static String normalizeOptionalMembershipRole(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        return normalizeMembershipRole(role);
    }

    static String normalizeOptionalMembershipStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = normalizeRequired(status, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_MEMBERSHIP_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: " + STATUS_ACTIVE + ", " + STATUS_SUSPENDED);
        }
        return normalized;
    }

    static boolean isActiveOwner(String role, String status) {
        return ROLE_OWNER.equals(role) && STATUS_ACTIVE.equals(status);
    }

    static void ensureTenantIsActive(Tenant tenant) {
        if (!STATUS_ACTIVE.equals(tenant.getStatus())) {
            throw new ForbiddenTenantAccessException("requested tenant is not active");
        }
    }

    static long resolvePlanLimit(String planCode) {
        String normalized = normalizePlanCode(planCode);
        if (normalized.contains("starter")) {
            return PLAN_LIMIT_STARTER;
        }
        if (normalized.contains("pilot")) {
            return PLAN_LIMIT_PILOT;
        }
        if (normalized.contains("growth")) {
            return PLAN_LIMIT_GROWTH;
        }
        return 0L;
    }

    static Instant resolveUsagePeriodStart(TenantSubscription subscription, Instant eventTime) {
        if (subscription.getCurrentPeriodStartsAt() != null) {
            return subscription.getCurrentPeriodStartsAt();
        }
        return eventTime.atZone(ZoneOffset.UTC)
                .withDayOfMonth(1)
                .toLocalDate()
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();
    }

    static Instant resolveUsagePeriodEnd(TenantSubscription subscription, Instant periodStart) {
        if (subscription.getCurrentPeriodEndsAt() != null && subscription.getCurrentPeriodEndsAt().isAfter(periodStart)) {
            return subscription.getCurrentPeriodEndsAt();
        }
        return periodStart.atZone(ZoneOffset.UTC)
                .plusMonths(1)
                .toInstant();
    }

    static String normalizePlanCode(String planCode) {
        String normalized = normalizeRequired(planCode, "planCode", 64).toLowerCase(Locale.ROOT);
        if (!PLAN_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("planCode must match [a-z0-9._-]{2,64}");
        }
        return normalized;
    }

    static String normalizeSubscriptionStatus(String status) {
        String normalized = normalizeRequired(status, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_SUBSCRIPTION_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: trialing, active, past_due, canceled");
        }
        return normalized;
    }

    static String normalizeBillingCycle(String billingCycle) {
        String normalized = normalizeRequired(billingCycle, "billingCycle", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_BILLING_CYCLES.contains(normalized)) {
            throw new IllegalArgumentException("billingCycle must be one of: monthly, annual");
        }
        return normalized;
    }

    static void validateSubscriptionPeriod(Instant currentPeriodStartsAt, Instant currentPeriodEndsAt) {
        if (currentPeriodStartsAt != null && currentPeriodEndsAt != null && !currentPeriodEndsAt.isAfter(currentPeriodStartsAt)) {
            throw new IllegalArgumentException("currentPeriodEndsAt must be after currentPeriodStartsAt");
        }
    }

    static String normalizeUsageEventType(String eventType) {
        String normalized = normalizeRequired(eventType, "eventType", 64).toLowerCase(Locale.ROOT);
        if (!PLAN_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("eventType must match [a-z0-9._-]{2,64}");
        }
        return normalized;
    }

    static String normalizeUsageEventTypeFilter(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return null;
        }
        return normalizeUsageEventType(eventType);
    }

    static Instant parseOptionalInstant(String value, String fieldName) {
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

    static long normalizeUsageEventValue(Long eventValue) {
        if (eventValue == null) {
            throw new IllegalArgumentException("eventValue is required");
        }
        if (eventValue < 0) {
            throw new IllegalArgumentException("eventValue must be >= 0");
        }
        return eventValue;
    }

    static JsonNode normalizeUsageMetadata(JsonNode metadata) {
        if (metadata == null || metadata.isNull()) {
            return null;
        }
        if (!(metadata instanceof ObjectNode)) {
            throw new IllegalArgumentException("metadata must be a JSON object");
        }
        return metadata;
    }

    static String normalizeColor(String value, String fieldName) {
        String normalized = normalizeOptional(value, 16);
        if (normalized == null) {
            return null;
        }
        if (!HEX_COLOR_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(fieldName + " must match #RRGGBB");
        }
        return normalized.toUpperCase(Locale.ROOT);
    }

    static String resolvePilotRiskStatus(long openSupportCases,
                                         long hostSignIns,
                                         long sessionLaunches,
                                         long completedSessions,
                                         long upgradeAttempts,
                                         long paidActivations) {
        if (openSupportCases > 0) {
            return "needs_attention";
        }
        if (hostSignIns > 0 && sessionLaunches == 0) {
            return "onboarding_friction";
        }
        if (sessionLaunches > 0 && completedSessions == 0) {
            return "live_run_friction";
        }
        if (upgradeAttempts > 0 && paidActivations == 0) {
            return "conversion_risk";
        }
        return "tracking";
    }

    static String resolvePilotRecommendation(String riskStatus, String topOpenSupportCategory) {
        return switch (riskStatus) {
            case "needs_attention" -> topOpenSupportCategory == null
                    ? "Review and close open pilot support cases before widening pilots."
                    : "Resolve the highest open support category before widening pilots: " + topOpenSupportCategory + ".";
            case "onboarding_friction" -> "Hosts sign in but do not launch; tighten onboarding and host setup guidance.";
            case "live_run_friction" -> "Hosts launch but do not complete sessions; review live-run blockers and support notes.";
            case "conversion_risk" -> "Upgrade intent exists without paid activation; inspect checkout friction and pricing objections.";
            default -> "Continue collecting repeat-host and paid-retention evidence from real pilot traffic.";
        };
    }

    static String normalizeSlug(String requestedSlug, String fallbackName) {
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

    static int resolveAuditLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_AUDIT_LIMIT;
        }
        if (limit < 1 || limit > MAX_AUDIT_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_AUDIT_LIMIT);
        }
        return limit;
    }

    static int resolveUsageLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_USAGE_LIMIT;
        }
        if (limit < 1 || limit > MAX_USAGE_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_USAGE_LIMIT);
        }
        return limit;
    }

    static String resolveBillingLifecycleUsageEvent(String status) {
        String normalizedStatus = normalizeSubscriptionStatus(status);
        return switch (normalizedStatus) {
            case SUBSCRIPTION_STATUS_ACTIVE -> "billing.subscription.activated";
            case "canceled" -> "billing.subscription.canceled";
            default -> "billing.subscription.updated";
        };
    }

    static TenantRuntimeCapabilitiesResponse resolveRuntimeCapabilities(UUID tenantId,
                                                                       TenantSubscriptionResponse subscription) {
        String normalizedStatus = normalizeOptional(subscription == null ? null : subscription.status(), 32);
        String normalizedPlanCode = normalizeOptional(subscription == null ? null : subscription.planCode(), 64);

        boolean proHost = normalizedStatus != null
                && SUBSCRIPTION_STATUS_ACTIVE.equals(normalizedStatus.toLowerCase(Locale.ROOT))
                && normalizedPlanCode != null
                && !normalizedPlanCode.toLowerCase(Locale.ROOT).contains("starter");

        return new TenantRuntimeCapabilitiesResponse(
                tenantId,
                proHost ? "pro_host" : "trial",
                proHost ? RuntimeLimits.MAX_PLAYERS_PER_ROOM : 4,
                proHost,
                proHost,
                proHost
        );
    }

    static TenantBranding defaultBranding(Tenant tenant) {
        TenantBranding branding = new TenantBranding();
        branding.setTenantId(tenant.getId());
        branding.setAppName(tenant.getName());
        branding.setPrimaryColor("#1E293B");
        branding.setSecondaryColor("#0EA5E9");
        return branding;
    }

    static TenantDetailResponse toDetail(Tenant tenant, TenantBranding branding) {
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

    static TenantMemberResponse toMemberResponse(TenantMembership membership) {
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

    static TenantSubscriptionResponse toSubscriptionResponse(TenantSubscription subscription) {
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

    static long readUsageTotal(Map<String, TenantUsageSummaryResponse> usageSummary, String eventType) {
        TenantUsageSummaryResponse response = usageSummary.get(eventType);
        return response == null ? 0L : response.totalValue();
    }

    static MeTenantAccessResponse toMeTenantAccessResponse(TenantMembership membership, Map<UUID, Tenant> tenantsById) {
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
}
