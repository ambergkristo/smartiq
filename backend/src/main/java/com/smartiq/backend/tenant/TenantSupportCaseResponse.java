package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantSupportCaseResponse(
        UUID tenantId,
        String caseId,
        String title,
        String category,
        String priority,
        String status,
        String owner,
        String summary,
        String nextStep,
        String resolution,
        Instant openedAt,
        Instant updatedAt,
        Instant resolvedAt
) {
}
