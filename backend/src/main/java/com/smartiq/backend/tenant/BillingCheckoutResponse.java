package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record BillingCheckoutResponse(
        String checkoutSessionId,
        String checkoutUrl,
        UUID tenantId,
        String planCode,
        String billingCycle,
        Instant expiresAt,
        String status
) {
}
