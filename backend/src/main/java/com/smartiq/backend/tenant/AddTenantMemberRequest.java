package com.smartiq.backend.tenant;

public record AddTenantMemberRequest(
        String email,
        String displayName,
        String role
) {
}
