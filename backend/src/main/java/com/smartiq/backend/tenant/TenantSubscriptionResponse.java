package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantSubscriptionResponse(
        UUID tenantId,
        String planCode,
        String status,
        String billingCycle,
        Instant trialEndsAt,
        Instant currentPeriodStartsAt,
        Instant currentPeriodEndsAt,
        Instant updatedAt
) {
}
