package com.smartiq.backend.tenant;

public record OnboardingBootstrapResponse(
        TenantDetailResponse tenant,
        TenantMemberResponse member,
        MeResponse me,
        RuntimeAuthContextResponse runtimeAuth
) {
}
