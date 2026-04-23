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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TenantBillingUsageService {

    private static final String AUDIT_ACTION_TENANT_SUBSCRIPTION_UPDATED = "TENANT_SUBSCRIPTION_UPDATED";
    private static final String AUDIT_ACTION_TENANT_USAGE_LIMIT_REJECTED = "TENANT_USAGE_LIMIT_REJECTED";
    private static final String AUDIT_ENTITY_TENANT_SUBSCRIPTION = "tenant_subscription";
    private static final String AUDIT_ENTITY_TENANT_USAGE_EVENT = "tenant_usage_event";
    private static final String USAGE_EVENT_HOST_WORKSPACE_BOOTSTRAPPED = "host.workspace.bootstrapped";
    private static final String USAGE_EVENT_HOST_AUTH_COMPLETED = "host.auth.completed";
    private static final String USAGE_EVENT_HOST_SESSION_STARTED = "host.session.started";
    private static final String USAGE_EVENT_HOST_SESSION_DUPLICATED = "host.session.duplicated";
    private static final String USAGE_EVENT_HOST_SESSION_RESUMED = "host.session.resumed";
    private static final String USAGE_EVENT_HOST_SESSION_COMPLETED = "host.session.completed";
    private static final String USAGE_EVENT_BILLING_CHECKOUT_STARTED = "billing.checkout.started";
    private static final String USAGE_EVENT_BILLING_SUBSCRIPTION_ACTIVATED = "billing.subscription.activated";

    private final TenantRepository tenantRepository;
    private final TenantSubscriptionRepository tenantSubscriptionRepository;
    private final TenantUsageEventRepository tenantUsageEventRepository;
    private final TenantAuditEventRepository tenantAuditEventRepository;
    private final TenantSupportCaseService tenantSupportCaseService;
    private final ObjectMapper objectMapper;

    public TenantBillingUsageService(TenantRepository tenantRepository,
                                     TenantSubscriptionRepository tenantSubscriptionRepository,
                                     TenantUsageEventRepository tenantUsageEventRepository,
                                     TenantAuditEventRepository tenantAuditEventRepository,
                                     TenantSupportCaseService tenantSupportCaseService,
                                     ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantSubscriptionRepository = tenantSubscriptionRepository;
        this.tenantUsageEventRepository = tenantUsageEventRepository;
        this.tenantAuditEventRepository = tenantAuditEventRepository;
        this.tenantSupportCaseService = tenantSupportCaseService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public TenantSubscriptionResponse getTenantSubscription(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
        return tenantSubscriptionRepository.findByTenantId(tenantId)
                .map(TenantDomainSupport::toSubscriptionResponse)
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
    public TenantSubscriptionResponse updateTenantSubscription(UUID tenantId,
                                                               UpdateTenantSubscriptionRequest request,
                                                               UUID actorUserId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String planCode = TenantDomainSupport.normalizePlanCode(request == null ? null : request.planCode());
        String status = TenantDomainSupport.normalizeSubscriptionStatus(request == null ? null : request.status());
        String billingCycle = TenantDomainSupport.normalizeBillingCycle(request == null ? null : request.billingCycle());
        Instant trialEndsAt = request == null ? null : request.trialEndsAt();
        Instant currentPeriodStartsAt = request == null ? null : request.currentPeriodStartsAt();
        Instant currentPeriodEndsAt = request == null ? null : request.currentPeriodEndsAt();
        TenantDomainSupport.validateSubscriptionPeriod(currentPeriodStartsAt, currentPeriodEndsAt);

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

        return TenantDomainSupport.toSubscriptionResponse(subscription);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public TenantUsageEventResponse createTenantUsageEvent(UUID tenantId, CreateTenantUsageEventRequest request) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        String eventType = TenantDomainSupport.normalizeUsageEventType(request == null ? null : request.eventType());
        long eventValue = TenantDomainSupport.normalizeUsageEventValue(request == null ? null : request.eventValue());
        Instant now = Instant.now();
        Instant eventTime = request == null || request.eventTime() == null ? now : request.eventTime();
        JsonNode metadata = TenantDomainSupport.normalizeUsageMetadata(request == null ? null : request.metadata());

        TenantSubscription subscription = tenantSubscriptionRepository.findByTenantId(tenantId).orElse(null);
        enforceUsagePlanLimit(tenantId, subscription, eventType, eventValue, eventTime, now);

        TenantUsageEvent event = new TenantUsageEvent();
        event.setId(UUID.randomUUID());
        event.setTenantId(tenantId);
        event.setEventType(eventType);
        event.setEventValue(eventValue);
        event.setEventTime(eventTime);
        event.setMetadataJson(metadata == null ? null : writeJson(metadata));
        event.setCreatedAt(now);
        tenantUsageEventRepository.save(event);

        return toUsageEventResponse(event);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public TenantUsageEventResponse recordRuntimeUsageEvent(UUID tenantId,
                                                            String eventType,
                                                            long eventValue,
                                                            JsonNode metadata,
                                                            Instant eventTime) {
        return createTenantUsageEvent(
                tenantId,
                new CreateTenantUsageEventRequest(
                        eventType,
                        eventValue,
                        eventTime,
                        metadata
                )
        );
    }

    @Transactional(readOnly = true)
    public List<TenantUsageEventResponse> listTenantUsageEvents(UUID tenantId, String eventType, Integer limit) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        int resolvedLimit = TenantDomainSupport.resolveUsageLimit(limit);
        PageRequest pageRequest = PageRequest.of(
                0,
                resolvedLimit,
                Sort.by(Sort.Order.desc("eventTime"), Sort.Order.desc("createdAt"))
        );

        String normalizedType = TenantDomainSupport.normalizeUsageEventTypeFilter(eventType);
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

        String normalizedEventType = TenantDomainSupport.normalizeUsageEventTypeFilter(eventType);
        Instant fromInclusive = TenantDomainSupport.parseOptionalInstant(from, "from");
        Instant toInclusive = TenantDomainSupport.parseOptionalInstant(to, "to");
        if (fromInclusive != null && toInclusive != null && fromInclusive.isAfter(toInclusive)) {
            throw new IllegalArgumentException("from must be less than or equal to to");
        }

        return tenantUsageEventRepository.findAllByTenantId(tenantId).stream()
                .filter(event -> normalizedEventType == null || normalizedEventType.equals(event.getEventType()))
                .filter(event -> fromInclusive == null || !event.getEventTime().isBefore(fromInclusive))
                .filter(event -> toInclusive == null || !event.getEventTime().isAfter(toInclusive))
                .collect(Collectors.groupingBy(
                        TenantUsageEvent::getEventType,
                        TreeMap::new,
                        Collectors.toList()
                ))
                .entrySet()
                .stream()
                .map(entry -> new TenantUsageSummaryResponse(
                        tenantId,
                        entry.getKey(),
                        entry.getValue().stream().mapToLong(TenantUsageEvent::getEventValue).sum(),
                        entry.getValue().size(),
                        entry.getValue().stream().map(TenantUsageEvent::getEventTime).min(Instant::compareTo).orElse(null),
                        entry.getValue().stream().map(TenantUsageEvent::getEventTime).max(Instant::compareTo).orElse(null)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantPilotSummaryResponse getTenantPilotSummary(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }

        Map<String, TenantUsageSummaryResponse> usageSummary = getTenantUsageSummary(tenantId, null, null, null).stream()
                .collect(Collectors.toMap(
                        TenantUsageSummaryResponse::eventType,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        List<TenantSupportCaseResponse> supportCases = tenantSupportCaseService.listSupportCases(tenantId);
        TenantSubscriptionResponse subscription = getTenantSubscription(tenantId);

        long workspaceBootstraps = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_HOST_WORKSPACE_BOOTSTRAPPED);
        long hostSignIns = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_HOST_AUTH_COMPLETED);
        long sessionLaunches = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_HOST_SESSION_STARTED);
        long duplicateLaunches = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_HOST_SESSION_DUPLICATED);
        long resumeActions = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_HOST_SESSION_RESUMED);
        long completedSessions = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_HOST_SESSION_COMPLETED);
        long upgradeAttempts = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_BILLING_CHECKOUT_STARTED);
        long paidActivations = TenantDomainSupport.readUsageTotal(usageSummary, USAGE_EVENT_BILLING_SUBSCRIPTION_ACTIVATED);

        long openSupportCases = supportCases.stream()
                .filter(caseResponse -> !"resolved".equals(caseResponse.status()))
                .count();
        long resolvedSupportCases = supportCases.stream()
                .filter(caseResponse -> "resolved".equals(caseResponse.status()))
                .count();
        String topOpenSupportCategory = supportCases.stream()
                .filter(caseResponse -> !"resolved".equals(caseResponse.status()))
                .collect(Collectors.groupingBy(
                        TenantSupportCaseResponse::category,
                        LinkedHashMap::new,
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted((left, right) -> Long.compare(right.getValue(), left.getValue()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);

        boolean activated = workspaceBootstraps > 0 || hostSignIns > 0;
        boolean repeatHost = completedSessions >= 2 || duplicateLaunches > 0 || resumeActions > 0;
        boolean paidConverted = paidActivations > 0;
        String riskStatus = TenantDomainSupport.resolvePilotRiskStatus(
                openSupportCases,
                hostSignIns,
                sessionLaunches,
                completedSessions,
                upgradeAttempts,
                paidActivations
        );
        String recommendation = TenantDomainSupport.resolvePilotRecommendation(riskStatus, topOpenSupportCategory);

        return new TenantPilotSummaryResponse(
                tenantId,
                TenantDomainSupport.normalizeOptional(subscription.planCode(), 64),
                TenantDomainSupport.normalizeOptional(subscription.status(), 32),
                workspaceBootstraps,
                hostSignIns,
                sessionLaunches,
                duplicateLaunches,
                resumeActions,
                completedSessions,
                upgradeAttempts,
                paidActivations,
                activated,
                repeatHost,
                paidConverted,
                openSupportCases,
                resolvedSupportCases,
                topOpenSupportCategory,
                riskStatus,
                recommendation
        );
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void recordBillingSubscriptionLifecycle(UUID tenantId,
                                                   String planCode,
                                                   String status,
                                                   String billingCycle,
                                                   Instant eventTime) {
        Instant recordedAt = eventTime == null ? Instant.now() : eventTime;
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("planCode", TenantDomainSupport.normalizePlanCode(planCode));
        metadata.put("status", TenantDomainSupport.normalizeSubscriptionStatus(status));
        metadata.put("billingCycle", TenantDomainSupport.normalizeBillingCycle(billingCycle));
        String lifecycleEvent = TenantDomainSupport.resolveBillingLifecycleUsageEvent(status);
        recordRuntimeUsageEvent(tenantId, lifecycleEvent, 1L, metadata, recordedAt);
        if (!"billing.subscription.updated".equals(lifecycleEvent)) {
            recordRuntimeUsageEvent(tenantId, "billing.subscription.updated", 1L, metadata, recordedAt);
        }
    }

    private void enforceUsagePlanLimit(UUID tenantId,
                                       TenantSubscription subscription,
                                       String eventType,
                                       long eventValue,
                                       Instant eventTime,
                                       Instant now) {
        if (subscription == null || subscription.getPlanCode() == null || subscription.getPlanCode().isBlank()) {
            return;
        }

        String subscriptionStatus = TenantDomainSupport.normalizeSubscriptionStatus(subscription.getStatus());
        if (!TenantDomainSupport.SUBSCRIPTION_STATUS_ACTIVE.equals(subscriptionStatus)
                && !TenantDomainSupport.SUBSCRIPTION_STATUS_TRIALING.equals(subscriptionStatus)) {
            throw new IllegalArgumentException("subscription status does not allow usage ingestion");
        }

        long planLimit = TenantDomainSupport.resolvePlanLimit(subscription.getPlanCode());
        if (planLimit <= 0L) {
            return;
        }

        Instant periodStart = TenantDomainSupport.resolveUsagePeriodStart(subscription, eventTime);
        Instant periodEnd = TenantDomainSupport.resolveUsagePeriodEnd(subscription, periodStart);
        if (!eventTime.isBefore(periodEnd)) {
            throw new IllegalArgumentException("eventTime must be within current subscription period");
        }

        long currentTotal = tenantUsageEventRepository.sumEventValueByTenantIdAndEventTimeRange(tenantId, periodStart, periodEnd);
        long projectedTotal = currentTotal + eventValue;
        if (projectedTotal <= planLimit) {
            return;
        }

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("eventType", eventType);
        metadata.put("eventValue", eventValue);
        metadata.put("periodStart", periodStart.toString());
        metadata.put("periodEndExclusive", periodEnd.toString());
        metadata.put("currentTotal", currentTotal);
        metadata.put("projectedTotal", projectedTotal);
        metadata.put("planLimit", planLimit);
        metadata.put("planCode", subscription.getPlanCode());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_USAGE_LIMIT_REJECTED,
                AUDIT_ENTITY_TENANT_USAGE_EVENT,
                null,
                metadata,
                now,
                null
        );
        throw new IllegalArgumentException("plan limit reached for current period");
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

    private String writeJson(JsonNode jsonNode) {
        try {
            return objectMapper.writeValueAsString(jsonNode);
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
        event.setMetadataJson(writeJson(metadata));
        event.setEventTime(eventTime);
        event.setCreatedAt(eventTime);
        tenantAuditEventRepository.save(event);
    }
}
