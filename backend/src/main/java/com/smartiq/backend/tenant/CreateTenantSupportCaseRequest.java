package com.smartiq.backend.tenant;

public record CreateTenantSupportCaseRequest(
        String title,
        String category,
        String priority,
        String owner,
        String summary,
        String nextStep
) {
}
