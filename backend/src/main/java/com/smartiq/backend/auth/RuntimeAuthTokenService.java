package com.smartiq.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smartiq.backend.config.AuthContextProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Component
public class RuntimeAuthTokenService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    private final AuthContextProperties properties;
    private final ObjectMapper objectMapper;

    public RuntimeAuthTokenService(AuthContextProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String issueBearerToken(String email, UUID tenantId) {
        String normalizedEmail = normalizeRequired(email, "email is required");

        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(resolveBootstrapTokenTtlSeconds());

        ObjectNode header = objectMapper.createObjectNode();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("email", normalizedEmail);
        if (tenantId != null) {
            payload.put("tenant_id", tenantId.toString());
        }
        payload.put("iss", resolveIssuer());
        payload.put("aud", resolveAudience());
        payload.put("iat", now.getEpochSecond());
        payload.put("exp", expiresAt.getEpochSecond());

        String encodedHeader = encodeJson(header);
        String encodedPayload = encodeJson(payload);
        String signature = sign(encodedHeader + "." + encodedPayload, requireJwtSecret());
        return "Bearer " + encodedHeader + "." + encodedPayload + "." + signature;
    }

    public JsonNode verifyAndDecodePayload(String token) {
        String normalizedToken = normalizeRequired(token, "bearer token is required");
        String[] parts = normalizedToken.split("\\.", -1);
        if (parts.length != 3) {
            throw new IllegalArgumentException("bearer token must be JWT formatted");
        }
        if (!StringUtils.hasText(parts[0]) || !StringUtils.hasText(parts[1]) || !StringUtils.hasText(parts[2])) {
            throw new IllegalArgumentException("bearer token must contain header, payload, and signature");
        }

        JsonNode header = decodeJson(parts[0], "bearer token header is invalid");
        String algorithm = normalizeRequired(header.path("alg").asText(null), "bearer token alg is required");
        if (!"HS256".equals(algorithm)) {
            throw new IllegalArgumentException("bearer token alg must be HS256");
        }

        String expectedSignature = sign(parts[0] + "." + parts[1], requireJwtSecret());
        byte[] actualSignature = decodeBase64(parts[2], "bearer token signature is invalid");
        byte[] expectedSignatureBytes = decodeBase64(expectedSignature, "configured bearer token signature is invalid");
        if (!MessageDigest.isEqual(actualSignature, expectedSignatureBytes)) {
            throw new IllegalArgumentException("bearer token signature is invalid");
        }

        JsonNode payload = decodeJson(parts[1], "bearer token payload is invalid");
        verifyStandardClaims(payload);
        return payload;
    }

    private void verifyStandardClaims(JsonNode payload) {
        String issuer = normalizeRequired(payload.path("iss").asText(null), "issuer claim missing in bearer token");
        if (!resolveIssuer().equals(issuer)) {
            throw new IllegalArgumentException("bearer token issuer is invalid");
        }

        String audience = normalizeRequired(payload.path("aud").asText(null), "audience claim missing in bearer token");
        if (!resolveAudience().equals(audience)) {
            throw new IllegalArgumentException("bearer token audience is invalid");
        }

        long now = Instant.now().getEpochSecond();
        long skewSeconds = Math.max(properties.clockSkewSeconds(), 0L);

        JsonNode issuedAtNode = payload.get("iat");
        if (issuedAtNode == null || !issuedAtNode.canConvertToLong()) {
            throw new IllegalArgumentException("iat claim missing in bearer token");
        }
        long issuedAt = issuedAtNode.asLong();
        if (issuedAt > now + skewSeconds) {
            throw new IllegalArgumentException("bearer token iat is invalid");
        }

        JsonNode expirationNode = payload.get("exp");
        if (expirationNode == null || !expirationNode.canConvertToLong()) {
            throw new IllegalArgumentException("exp claim missing in bearer token");
        }
        long expiration = expirationNode.asLong();
        if (expiration < now - skewSeconds) {
            throw new IllegalArgumentException("bearer token is expired");
        }
    }

    private String encodeJson(JsonNode node) {
        try {
            return URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(node));
        } catch (Exception ex) {
            throw new IllegalStateException("failed to encode runtime auth token", ex);
        }
    }

    private JsonNode decodeJson(String encodedValue, String errorMessage) {
        try {
            return objectMapper.readTree(URL_DECODER.decode(encodedValue));
        } catch (Exception ex) {
            throw new IllegalArgumentException(errorMessage, ex);
        }
    }

    private String sign(String value, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            return URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("failed to sign runtime auth token", ex);
        }
    }

    private byte[] decodeBase64(String value, String errorMessage) {
        try {
            return URL_DECODER.decode(value);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(errorMessage, ex);
        }
    }

    private String requireJwtSecret() {
        return normalizeRequired(properties.jwtSecret(), "smartiq.auth.context.jwt-secret must be configured");
    }

    private String resolveIssuer() {
        return normalizeRequired(properties.issuer(), "smartiq.auth.context.issuer must be configured");
    }

    private String resolveAudience() {
        return normalizeRequired(properties.audience(), "smartiq.auth.context.audience must be configured");
    }

    private long resolveBootstrapTokenTtlSeconds() {
        return properties.bootstrapTokenTtlSeconds() > 0 ? properties.bootstrapTokenTtlSeconds() : 3600L;
    }

    private static String normalizeRequired(String value, String errorMessage) {
        if (value == null) {
            throw new IllegalArgumentException(errorMessage);
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException(errorMessage);
        }
        return normalized;
    }
}
