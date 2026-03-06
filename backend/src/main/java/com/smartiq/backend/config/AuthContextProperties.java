package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "smartiq.auth.context")
public record AuthContextProperties(
        boolean headerFallbackEnabled,
        String userEmailHeader,
        String tenantIdHeader,
        List<String> emailClaims,
        String tenantIdClaim,
        String jwtSecret,
        String issuer,
        String audience,
        long clockSkewSeconds,
        long bootstrapTokenTtlSeconds,
        boolean magicLinkEchoEnabled,
        long loginChallengeTtlSeconds
) {
}
