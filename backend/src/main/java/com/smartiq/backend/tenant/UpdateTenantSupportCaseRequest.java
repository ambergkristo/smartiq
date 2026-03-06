package com.smartiq.backend.tenant;

public record UpdateTenantSupportCaseRequest(
        String status,
        String owner,
        String summary,
        String nextStep,
        String resolution
) {
}
