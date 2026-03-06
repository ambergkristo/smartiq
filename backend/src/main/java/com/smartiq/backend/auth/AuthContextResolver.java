package com.smartiq.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartiq.backend.config.AuthContextProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Component
public class AuthContextResolver {

    private static final String BEARER_PREFIX = "bearer ";

    private final AuthContextProperties properties;
    private final RuntimeAuthTokenService runtimeAuthTokenService;

    public AuthContextResolver(AuthContextProperties properties, RuntimeAuthTokenService runtimeAuthTokenService) {
        this.properties = properties;
        this.runtimeAuthTokenService = runtimeAuthTokenService;
    }

    public ResolvedAuthContext resolve(HttpServletRequest request) {
        ResolvedAuthContext resolved = resolveOptional(request);
        if (resolved != null) {
            return resolved;
        }

        if (!properties.headerFallbackEnabled()) {
            throw new IllegalArgumentException("Authorization bearer token is required");
        }
        throw new IllegalArgumentException("auth email is required");
    }

    public ResolvedAuthContext resolveOptional(HttpServletRequest request) {
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (hasBearerToken(authorizationHeader)) {
            return resolveFromBearerToken(extractBearerToken(authorizationHeader));
        }

        if (!properties.headerFallbackEnabled()) {
            return null;
        }

        String emailHeader = request.getHeader(properties.userEmailHeader());
        String tenantHeader = request.getHeader(properties.tenantIdHeader());
        if (!StringUtils.hasText(emailHeader) && !StringUtils.hasText(tenantHeader)) {
            return null;
        }

        String email = normalizeRequired(emailHeader, "auth email is required");
        UUID tenantId = parseOptionalUuid(request.getHeader(properties.tenantIdHeader()), "tenant header must be a UUID");
        return new ResolvedAuthContext(email, tenantId);
    }

    private ResolvedAuthContext resolveFromBearerToken(String token) {
        JsonNode payload = runtimeAuthTokenService.verifyAndDecodePayload(token);
        String email = extractEmail(payload);
        UUID tenantId = extractTenantId(payload);
        return new ResolvedAuthContext(email, tenantId);
    }

    private String extractEmail(JsonNode payload) {
        List<String> claimNames = properties.emailClaims();
        if (claimNames == null || claimNames.isEmpty()) {
            throw new IllegalArgumentException("auth email claims are not configured");
        }
        for (String claimName : claimNames) {
            JsonNode valueNode = payload.get(claimName);
            if (valueNode == null || valueNode.isNull()) {
                continue;
            }
            String candidate = normalizeOptional(valueNode.asText());
            if (candidate != null) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("email claim missing in bearer token");
    }

    private UUID extractTenantId(JsonNode payload) {
        String tenantClaim = normalizeOptional(properties.tenantIdClaim());
        if (tenantClaim == null) {
            return null;
        }
        JsonNode valueNode = payload.get(tenantClaim);
        if (valueNode == null || valueNode.isNull()) {
            return null;
        }
        return parseOptionalUuid(valueNode.asText(), "tenant claim must be a UUID");
    }

    private static boolean hasBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader)) {
            return false;
        }
        return authorizationHeader.toLowerCase(Locale.ROOT).startsWith(BEARER_PREFIX);
    }

    private static String extractBearerToken(String authorizationHeader) {
        return normalizeRequired(authorizationHeader.substring(BEARER_PREFIX.length()), "bearer token is required");
    }

    private static UUID parseOptionalUuid(String rawValue, String errorMessage) {
        String normalized = normalizeOptional(rawValue);
        if (normalized == null) {
            return null;
        }
        try {
            return UUID.fromString(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(errorMessage, ex);
        }
    }

    private static String normalizeRequired(String value, String errorMessage) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new IllegalArgumentException(errorMessage);
        }
        return normalized;
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
