package com.smartiq.backend.tenant;

public record UpdateTenantMemberRequest(
        String role,
        String status
) {
}
