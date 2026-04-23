package com.smartiq.backend.tenant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@Service
class TenantSupportCaseService {

    private static final String AUDIT_ACTION_SUPPORT_CASE_OPENED = "SUPPORT_CASE_OPENED";
    private static final String AUDIT_ACTION_SUPPORT_CASE_UPDATED = "SUPPORT_CASE_UPDATED";
    private static final String AUDIT_ACTION_SUPPORT_CASE_RESOLVED = "SUPPORT_CASE_RESOLVED";
    private static final String AUDIT_ENTITY_SUPPORT_CASE = "support_case";
    private static final Set<String> ALLOWED_SUPPORT_CASE_CATEGORIES = Set.of("onboarding", "live_run", "billing", "retention", "general");
    private static final Set<String> ALLOWED_SUPPORT_CASE_PRIORITIES = Set.of("low", "medium", "high");
    private static final Set<String> ALLOWED_SUPPORT_CASE_STATUSES = Set.of("open", "monitoring", "resolved");

    private final TenantRepository tenantRepository;
    private final TenantAuditEventRepository tenantAuditEventRepository;
    private final ObjectMapper objectMapper;

    TenantSupportCaseService(TenantRepository tenantRepository,
                             TenantAuditEventRepository tenantAuditEventRepository,
                             ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantAuditEventRepository = tenantAuditEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<TenantSupportCaseResponse> listSupportCases(UUID tenantId) {
        assertTenantExists(tenantId);
        return buildSupportCaseIndex(tenantId).values().stream()
                .sorted((left, right) -> {
                    Instant leftUpdatedAt = left.updatedAt() == null ? left.openedAt() : left.updatedAt();
                    Instant rightUpdatedAt = right.updatedAt() == null ? right.openedAt() : right.updatedAt();
                    return rightUpdatedAt.compareTo(leftUpdatedAt);
                })
                .toList();
    }

    @Transactional
    public TenantSupportCaseResponse createSupportCase(UUID tenantId,
                                                       CreateTenantSupportCaseRequest request,
                                                       UUID actorUserId) {
        assertTenantExists(tenantId);

        String title = normalizeRequired(request == null ? null : request.title(), "title", 160);
        String category = normalizeSupportCaseCategory(request == null ? null : request.category());
        String priority = normalizeSupportCasePriority(request == null ? null : request.priority());
        String owner = normalizeRequired(request == null ? null : request.owner(), "owner", 120);
        String summary = normalizeRequired(request == null ? null : request.summary(), "summary", 1_000);
        String nextStep = normalizeOptional(request == null ? null : request.nextStep(), 500);
        Instant now = Instant.now();
        String caseId = "sc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("title", title);
        metadata.put("category", category);
        metadata.put("priority", priority);
        metadata.put("status", "open");
        metadata.put("owner", owner);
        metadata.put("summary", summary);
        if (nextStep != null) {
            metadata.put("nextStep", nextStep);
        }

        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_SUPPORT_CASE_OPENED,
                caseId,
                metadata,
                now,
                actorUserId
        );

        return new TenantSupportCaseResponse(
                tenantId,
                caseId,
                title,
                category,
                priority,
                "open",
                owner,
                summary,
                nextStep,
                null,
                now,
                now,
                null
        );
    }

    @Transactional
    public TenantSupportCaseResponse updateSupportCase(UUID tenantId,
                                                       String caseId,
                                                       UpdateTenantSupportCaseRequest request,
                                                       UUID actorUserId) {
        assertTenantExists(tenantId);

        String normalizedCaseId = normalizeRequired(caseId, "caseId", 40);
        TenantSupportCaseResponse current = buildSupportCaseIndex(tenantId).get(normalizedCaseId);
        if (current == null) {
            throw new NoSuchElementException("support case not found");
        }

        String nextStatus = normalizeSupportCaseStatus(request == null ? null : request.status(), current.status());
        String nextOwner = normalizeOptional(request == null ? null : request.owner(), 120);
        if (nextOwner == null) {
            nextOwner = current.owner();
        }
        String nextSummary = normalizeOptional(request == null ? null : request.summary(), 1_000);
        if (nextSummary == null) {
            nextSummary = current.summary();
        }
        String nextStep = normalizeOptional(request == null ? null : request.nextStep(), 500);
        if (nextStep == null) {
            nextStep = current.nextStep();
        }
        String nextResolution = normalizeOptional(request == null ? null : request.resolution(), 1_000);
        String resolution = nextResolution == null ? current.resolution() : nextResolution;
        Instant now = Instant.now();
        Instant resolvedAt = "resolved".equals(nextStatus)
                ? (current.resolvedAt() == null ? now : current.resolvedAt())
                : null;

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("title", current.title());
        metadata.put("category", current.category());
        metadata.put("priority", current.priority());
        metadata.put("status", nextStatus);
        metadata.put("owner", nextOwner);
        metadata.put("summary", nextSummary);
        if (nextStep != null) {
            metadata.put("nextStep", nextStep);
        }
        if (resolution != null) {
            metadata.put("resolution", resolution);
        }
        if (resolvedAt != null) {
            metadata.put("resolvedAt", resolvedAt.toString());
        }

        recordAuditEvent(
                tenantId,
                "resolved".equals(nextStatus) ? AUDIT_ACTION_SUPPORT_CASE_RESOLVED : AUDIT_ACTION_SUPPORT_CASE_UPDATED,
                normalizedCaseId,
                metadata,
                now,
                actorUserId
        );

        return new TenantSupportCaseResponse(
                tenantId,
                normalizedCaseId,
                current.title(),
                current.category(),
                current.priority(),
                nextStatus,
                nextOwner,
                nextSummary,
                nextStep,
                resolution,
                current.openedAt(),
                now,
                resolvedAt
        );
    }

    private void assertTenantExists(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
    }

    private Map<String, TenantSupportCaseResponse> buildSupportCaseIndex(UUID tenantId) {
        Map<String, TenantSupportCaseResponse> cases = new LinkedHashMap<>();
        tenantAuditEventRepository.findByTenantIdAndEntityTypeOrderByEventTimeAscCreatedAtAsc(tenantId, AUDIT_ENTITY_SUPPORT_CASE)
                .forEach(event -> {
                    JsonNode metadata = parseAuditMetadataJson(event.getMetadataJson());
                    String caseId = normalizeOptional(event.getEntityId(), 40);
                    if (caseId == null) {
                        return;
                    }
                    TenantSupportCaseResponse current = cases.get(caseId);
                    String title = readJsonText(metadata, "title");
                    String category = readJsonText(metadata, "category");
                    String priority = readJsonText(metadata, "priority");
                    String owner = normalizeOptional(readJsonText(metadata, "owner"), 120);
                    String summary = normalizeOptional(readJsonText(metadata, "summary"), 1_000);
                    String nextStep = normalizeOptional(readJsonText(metadata, "nextStep"), 500);
                    String resolution = normalizeOptional(readJsonText(metadata, "resolution"), 1_000);
                    String status = normalizeSupportCaseStatus(readJsonText(metadata, "status"), current == null ? "open" : current.status());
                    Instant resolvedAt = parseSupportCaseResolvedAt(metadata);

                    cases.put(caseId, new TenantSupportCaseResponse(
                            tenantId,
                            caseId,
                            title == null && current != null ? current.title() : title,
                            normalizeSupportCaseCategory(category == null && current != null ? current.category() : category),
                            normalizeSupportCasePriority(priority == null && current != null ? current.priority() : priority),
                            status,
                            owner == null && current != null ? current.owner() : owner,
                            summary == null && current != null ? current.summary() : summary,
                            nextStep == null && current != null ? current.nextStep() : nextStep,
                            resolution == null && current != null ? current.resolution() : resolution,
                            current == null ? event.getEventTime() : current.openedAt(),
                            event.getEventTime(),
                            resolvedAt == null && current != null && "resolved".equals(status) ? current.resolvedAt() : resolvedAt
                    ));
                });
        return cases;
    }

    private JsonNode parseAuditMetadataJson(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(metadataJson);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("stored audit metadata_json is invalid", ex);
        }
    }

    private void recordAuditEvent(UUID tenantId,
                                  String action,
                                  String caseId,
                                  JsonNode metadata,
                                  Instant eventTime,
                                  UUID actorUserId) {
        TenantAuditEvent event = new TenantAuditEvent();
        event.setId(UUID.randomUUID());
        event.setTenantId(tenantId);
        event.setActorUserId(actorUserId);
        event.setAction(action);
        event.setEntityType(AUDIT_ENTITY_SUPPORT_CASE);
        event.setEntityId(caseId);
        event.setMetadataJson(writeMetadataJson(metadata));
        event.setEventTime(eventTime);
        event.setCreatedAt(eventTime);
        tenantAuditEventRepository.save(event);
    }

    private String writeMetadataJson(JsonNode metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("settings payload is not serializable", ex);
        }
    }

    private static String readJsonText(JsonNode node, String fieldName) {
        if (node == null || node.isNull()) {
            return null;
        }
        JsonNode valueNode = node.get(fieldName);
        if (valueNode == null || valueNode.isNull() || !valueNode.isTextual()) {
            return null;
        }
        return valueNode.asText();
    }

    private static Instant parseSupportCaseResolvedAt(JsonNode metadata) {
        String resolvedAt = readJsonText(metadata, "resolvedAt");
        if (resolvedAt == null) {
            return null;
        }
        try {
            return Instant.parse(resolvedAt);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private static String normalizeSupportCaseCategory(String category) {
        String normalized = normalizeRequired(category, "category", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_SUPPORT_CASE_CATEGORIES.contains(normalized)) {
            throw new IllegalArgumentException("category must be one of: onboarding, live_run, billing, retention, general");
        }
        return normalized;
    }

    private static String normalizeSupportCasePriority(String priority) {
        String normalized = normalizeRequired(priority, "priority", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_SUPPORT_CASE_PRIORITIES.contains(normalized)) {
            throw new IllegalArgumentException("priority must be one of: low, medium, high");
        }
        return normalized;
    }

    private static String normalizeSupportCaseStatus(String status, String defaultStatus) {
        String fallback = defaultStatus == null || defaultStatus.isBlank() ? "open" : defaultStatus;
        String normalized = normalizeOptional(status, 32);
        if (normalized == null) {
            return fallback;
        }
        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (!ALLOWED_SUPPORT_CASE_STATUSES.contains(lowered)) {
            throw new IllegalArgumentException("status must be one of: open, monitoring, resolved");
        }
        return lowered;
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
            throw new IllegalArgumentException("value exceeds max length " + maxLength);
        }
        return normalized;
    }
}
