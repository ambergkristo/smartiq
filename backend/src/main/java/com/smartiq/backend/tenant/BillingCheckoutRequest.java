package com.smartiq.backend.tenant;

public record BillingCheckoutRequest(
        String planCode,
        String billingCycle
) {
}
