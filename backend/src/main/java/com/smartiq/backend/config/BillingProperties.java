package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.billing")
public record BillingProperties(
        String provider,
        String checkoutBaseUrl,
        String successReturnUrl,
        String cancelReturnUrl,
        String webhookSigningSecret,
        String webhookSignatureHeader
) {
}
