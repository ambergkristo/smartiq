package com.smartiq.backend.tenant;

import java.time.Instant;

public record UpdateTenantSubscriptionRequest(
        String planCode,
        String status,
        String billingCycle,
        Instant trialEndsAt,
        Instant currentPeriodStartsAt,
        Instant currentPeriodEndsAt
) {
}
