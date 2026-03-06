package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record BillingWebhookRequest(
        String eventId,
        UUID tenantId,
        String eventType,
        Instant occurredAt,
        String planCode,
        String status,
        String billingCycle,
        Instant trialEndsAt,
        Instant currentPeriodStartsAt,
        Instant currentPeriodEndsAt,
        JsonNode metadata
) {
}
