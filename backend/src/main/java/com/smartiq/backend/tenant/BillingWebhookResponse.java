package com.smartiq.backend.tenant;

import java.util.UUID;

public record BillingWebhookResponse(
        String eventId,
        UUID tenantId,
        String eventStatus,
        boolean applied,
        boolean duplicate,
        boolean stale,
        TenantSubscriptionResponse subscription
) {
}
