package com.smartiq.backend.tenant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.BillingProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.security.MessageDigest;
import java.util.regex.Pattern;

@Service
public class BillingService {

    private static final Pattern PLAN_CODE_PATTERN = Pattern.compile("^[a-z0-9._-]{2,64}$");
    private static final Set<String> ALLOWED_BILLING_CYCLES = Set.of("monthly", "annual");
    private static final Set<String> ALLOWED_SUBSCRIPTION_STATUSES = Set.of("trialing", "active", "past_due", "canceled");
    private static final String EVENT_SUBSCRIPTION_ACTIVATED = "subscription.activated";
    private static final String EVENT_SUBSCRIPTION_UPDATED = "subscription.updated";
    private static final String EVENT_SUBSCRIPTION_CANCELED = "subscription.canceled";
    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of(
            EVENT_SUBSCRIPTION_ACTIVATED,
            EVENT_SUBSCRIPTION_UPDATED,
            EVENT_SUBSCRIPTION_CANCELED
    );
    private static final String EVENT_STATUS_PROCESSED = "processed";
    private static final String EVENT_STATUS_IGNORED_DUPLICATE = "ignored_duplicate";
    private static final String EVENT_STATUS_IGNORED_STALE = "ignored_stale";

    private final TenantService tenantService;
    private final TenantRepository tenantRepository;
    private final TenantBillingEventRepository tenantBillingEventRepository;
    private final ObjectMapper objectMapper;
    private final BillingProperties billingProperties;

    public BillingService(TenantService tenantService,
                          TenantRepository tenantRepository,
                          TenantBillingEventRepository tenantBillingEventRepository,
                          ObjectMapper objectMapper,
                          BillingProperties billingProperties) {
        this.tenantService = tenantService;
        this.tenantRepository = tenantRepository;
        this.tenantBillingEventRepository = tenantBillingEventRepository;
        this.objectMapper = objectMapper;
        this.billingProperties = billingProperties;
    }

    @Transactional
    public BillingCheckoutResponse initiateCheckout(String userEmail, UUID tenantIdContext, BillingCheckoutRequest request) {
        if (tenantIdContext == null) {
            throw new IllegalArgumentException("tenant context is required");
        }

        tenantService.getMe(userEmail, tenantIdContext);
        String planCode = normalizePlanCode(request == null ? null : request.planCode());
        String billingCycle = normalizeBillingCycle(request == null ? null : request.billingCycle());
        String checkoutSessionId = "chk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Instant expiresAt = Instant.now().plusSeconds(30L * 60L);
        String checkoutUrl = buildCheckoutUrl(checkoutSessionId, tenantIdContext, planCode, billingCycle);
        tenantService.recordBillingCheckoutStarted(userEmail, tenantIdContext, planCode, billingCycle);

        return new BillingCheckoutResponse(
                checkoutSessionId,
                checkoutUrl,
                tenantIdContext,
                planCode,
                billingCycle,
                expiresAt,
                "initiated"
        );
    }

    @Transactional
    public BillingWebhookResponse ingestWebhook(BillingWebhookRequest request) {
        String eventId = normalizeRequired(request == null ? null : request.eventId(), "eventId", 128);
        UUID tenantId = request == null ? null : request.tenantId();
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId is required");
        }
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String eventType = normalizeEventType(request == null ? null : request.eventType());
        if (tenantBillingEventRepository.existsByEventId(eventId)) {
            return new BillingWebhookResponse(
                    eventId,
                    tenantId,
                    EVENT_STATUS_IGNORED_DUPLICATE,
                    false,
                    true,
                    false,
                    tenantService.getTenantSubscription(tenantId)
            );
        }

        Instant receivedAt = Instant.now();
        Instant occurredAt = request.occurredAt() == null ? receivedAt : request.occurredAt();

        TenantBillingEvent latest = tenantBillingEventRepository.findTopByTenantIdOrderByOccurredAtDescReceivedAtDesc(tenantId)
                .orElse(null);
        if (latest != null && occurredAt.isBefore(latest.getOccurredAt())) {
            persistLedger(eventId, tenantId, eventType, EVENT_STATUS_IGNORED_STALE, occurredAt, receivedAt, request);
            return new BillingWebhookResponse(
                    eventId,
                    tenantId,
                    EVENT_STATUS_IGNORED_STALE,
                    false,
                    false,
                    true,
                    tenantService.getTenantSubscription(tenantId)
            );
        }

        UpdateTenantSubscriptionRequest updateRequest = toSubscriptionUpdateRequest(eventType, request);
        TenantSubscriptionResponse updated = tenantService.updateTenantSubscription(tenantId, updateRequest);
        tenantService.recordBillingSubscriptionLifecycle(
                tenantId,
                updated.planCode(),
                updated.status(),
                updated.billingCycle(),
                occurredAt
        );
        persistLedger(eventId, tenantId, eventType, EVENT_STATUS_PROCESSED, occurredAt, receivedAt, request);

        return new BillingWebhookResponse(
                eventId,
                tenantId,
                EVENT_STATUS_PROCESSED,
                true,
                false,
                false,
                updated
        );
    }

    public BillingWebhookRequest parseWebhookPayload(String rawPayload) {
        String payload = rawPayload == null ? "" : rawPayload.trim();
        if (payload.isEmpty()) {
            throw new IllegalArgumentException("billing webhook payload is required");
        }
        try {
            return objectMapper.readValue(payload, BillingWebhookRequest.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("billing webhook payload is invalid", ex);
        }
    }

    public void verifyWebhookSignature(String rawPayload, String providedSignature) {
        String secret = normalizeOptional(billingProperties.webhookSigningSecret(), 512);
        if (secret == null) {
            throw new IllegalArgumentException("billing webhook signing secret is not configured");
        }
        String normalizedSignature = normalizeRequired(providedSignature, "billing webhook signature is required", 512);
        String expectedSignature = "sha256=" + hmacSha256Hex(rawPayload == null ? "" : rawPayload, secret);
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                normalizedSignature.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        )) {
            throw new IllegalArgumentException("billing webhook signature is invalid");
        }
    }

    private UpdateTenantSubscriptionRequest toSubscriptionUpdateRequest(String eventType, BillingWebhookRequest request) {
        String planCode = normalizePlanCode(request == null ? null : request.planCode());
        String billingCycle = normalizeBillingCycle(request == null ? null : request.billingCycle());
        String status = switch (eventType) {
            case EVENT_SUBSCRIPTION_ACTIVATED -> "active";
            case EVENT_SUBSCRIPTION_CANCELED -> "canceled";
            case EVENT_SUBSCRIPTION_UPDATED -> normalizeSubscriptionStatus(
                    request == null || request.status() == null || request.status().isBlank()
                            ? "active"
                            : request.status()
            );
            default -> throw new IllegalArgumentException("eventType is unsupported");
        };

        return new UpdateTenantSubscriptionRequest(
                planCode,
                status,
                billingCycle,
                request == null ? null : request.trialEndsAt(),
                request == null ? null : request.currentPeriodStartsAt(),
                request == null ? null : request.currentPeriodEndsAt()
        );
    }

    public String resolveWebhookSignatureHeaderName() {
        String configured = normalizeOptional(billingProperties.webhookSignatureHeader(), 128);
        return configured == null ? "X-SmartIQ-Billing-Signature" : configured;
    }

    private void persistLedger(String eventId,
                               UUID tenantId,
                               String eventType,
                               String eventStatus,
                               Instant occurredAt,
                               Instant receivedAt,
                               BillingWebhookRequest request) {
        TenantBillingEvent event = new TenantBillingEvent();
        event.setId(UUID.randomUUID());
        event.setEventId(eventId);
        event.setTenantId(tenantId);
        event.setEventType(eventType);
        event.setEventStatus(eventStatus);
        event.setOccurredAt(occurredAt);
        event.setReceivedAt(receivedAt);
        event.setPayloadJson(writePayloadJson(request));
        tenantBillingEventRepository.save(event);
    }

    private String writePayloadJson(BillingWebhookRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("billing webhook payload is not serializable", ex);
        }
    }

    private String buildCheckoutUrl(String checkoutSessionId, UUID tenantIdContext, String planCode, String billingCycle) {
        String checkoutBaseUrl = normalizeOptional(billingProperties.checkoutBaseUrl(), 512);
        if (checkoutBaseUrl == null) {
            throw new IllegalArgumentException("billing checkout base URL is not configured");
        }
        String provider = normalizeProvider();
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(checkoutBaseUrl)
                .queryParam("provider", provider)
                .queryParam("session_id", checkoutSessionId)
                .queryParam("tenant_id", tenantIdContext)
                .queryParam("plan", planCode)
                .queryParam("billing_cycle", billingCycle);

        String successReturnUrl = normalizeOptional(billingProperties.successReturnUrl(), 512);
        if (successReturnUrl != null) {
            builder.queryParam("success_url", successReturnUrl);
        }
        String cancelReturnUrl = normalizeOptional(billingProperties.cancelReturnUrl(), 512);
        if (cancelReturnUrl != null) {
            builder.queryParam("cancel_url", cancelReturnUrl);
        }

        return builder.build(true).toUriString();
    }

    private String normalizeProvider() {
        String provider = normalizeOptional(billingProperties.provider(), 64);
        if (provider == null) {
            throw new IllegalArgumentException("billing provider is not configured");
        }
        String normalized = provider.toLowerCase(Locale.ROOT);
        if ("local".equals(normalized) || "fake".equals(normalized) || "manual".equals(normalized) || "test".equals(normalized)) {
            throw new IllegalArgumentException("billing provider must be an external provider, not a local/fake checkout");
        }
        return normalized;
    }

    private static String hmacSha256Hex(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte part : digest) {
                hex.append(Character.forDigit((part >> 4) & 0xF, 16));
                hex.append(Character.forDigit(part & 0xF, 16));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("failed to sign billing webhook payload", ex);
        }
    }

    private static String normalizeEventType(String value) {
        String normalized = normalizeRequired(value, "eventType", 96).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EVENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("eventType is unsupported");
        }
        return normalized;
    }

    private static String normalizePlanCode(String value) {
        String normalized = normalizeRequired(value, "planCode", 64).toLowerCase(Locale.ROOT);
        if (!PLAN_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("planCode must match [a-z0-9._-]{2,64}");
        }
        return normalized;
    }

    private static String normalizeBillingCycle(String value) {
        String normalized = normalizeRequired(value, "billingCycle", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_BILLING_CYCLES.contains(normalized)) {
            throw new IllegalArgumentException("billingCycle must be one of: monthly, annual");
        }
        return normalized;
    }

    private static String normalizeSubscriptionStatus(String value) {
        String normalized = normalizeRequired(value, "status", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_SUBSCRIPTION_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of: trialing, active, past_due, canceled");
        }
        return normalized;
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
}
