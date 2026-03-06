package com.smartiq.backend.tenant;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.smartiq.backend.auth.RuntimeAuthTokenService;
import com.smartiq.backend.config.AuthContextProperties;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class TenantAuthService {

    private static final String DELIVERY_MODE_ECHO = "echo";
    private static final String DELIVERY_MODE_OUT_OF_BAND = "out_of_band";

    private final TenantService tenantService;
    private final RuntimeAuthTokenService runtimeAuthTokenService;
    private final AuthContextProperties authContextProperties;
    private final Cache<String, LoginChallenge> loginChallenges;

    public TenantAuthService(TenantService tenantService,
                             RuntimeAuthTokenService runtimeAuthTokenService,
                             AuthContextProperties authContextProperties) {
        this.tenantService = tenantService;
        this.runtimeAuthTokenService = runtimeAuthTokenService;
        this.authContextProperties = authContextProperties;
        long ttlSeconds = authContextProperties.loginChallengeTtlSeconds() > 0
                ? authContextProperties.loginChallengeTtlSeconds()
                : 900L;
        this.loginChallenges = Caffeine.newBuilder()
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .maximumSize(10_000)
                .build();
    }

    public AuthRequestLinkResponse requestLink(AuthRequestLinkRequest request) {
        String email = normalizeEmail(request == null ? null : request.email());
        UUID tenantId = resolveTenantId(email, request == null ? null : request.tenantId());

        Instant expiresAt = Instant.now().plusSeconds(resolveChallengeTtlSeconds());
        String challengeToken = "ml_" + UUID.randomUUID().toString().replace("-", "");
        loginChallenges.put(challengeToken, new LoginChallenge(email, tenantId, expiresAt));

        return new AuthRequestLinkResponse(
                tenantId,
                email,
                authContextProperties.magicLinkEchoEnabled() ? DELIVERY_MODE_ECHO : DELIVERY_MODE_OUT_OF_BAND,
                authContextProperties.magicLinkEchoEnabled() ? challengeToken : null,
                expiresAt
        );
    }

    public AuthCompleteResponse complete(AuthCompleteRequest request) {
        String challengeToken = normalizeRequired(request == null ? null : request.challengeToken(), "challengeToken is required");
        LoginChallenge challenge = loginChallenges.getIfPresent(challengeToken);
        if (challenge == null) {
            throw new IllegalArgumentException("challengeToken is invalid or expired");
        }
        if (challenge.expiresAt().isBefore(Instant.now())) {
            loginChallenges.invalidate(challengeToken);
            throw new IllegalArgumentException("challengeToken is invalid or expired");
        }

        loginChallenges.invalidate(challengeToken);
        MeResponse me = tenantService.getMe(challenge.email(), challenge.tenantId());
        RuntimeAuthContextResponse runtimeAuth = new RuntimeAuthContextResponse(
                runtimeAuthTokenService.issueBearerToken(challenge.email(), challenge.tenantId()),
                challenge.email(),
                challenge.tenantId()
        );
        tenantService.recordRuntimeAuthCompleted(challenge.email(), challenge.tenantId());
        return new AuthCompleteResponse(runtimeAuth, me);
    }

    private UUID resolveTenantId(String email, UUID requestedTenantId) {
        if (requestedTenantId != null) {
            tenantService.getMe(email, requestedTenantId);
            return requestedTenantId;
        }

        MeResponse me = tenantService.getMe(email, null);
        List<MeTenantAccessResponse> activeMemberships = me.memberships().stream()
                .filter(membership -> "active".equalsIgnoreCase(String.valueOf(membership.membershipStatus())))
                .sorted(Comparator.comparing(MeTenantAccessResponse::tenantName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        if (activeMemberships.isEmpty()) {
            throw new NoSuchElementException("membership not found");
        }
        if (activeMemberships.size() > 1) {
            throw new IllegalArgumentException("tenantId is required when user belongs to multiple active tenants");
        }
        return activeMemberships.getFirst().tenantId();
    }

    private long resolveChallengeTtlSeconds() {
        return authContextProperties.loginChallengeTtlSeconds() > 0
                ? authContextProperties.loginChallengeTtlSeconds()
                : 900L;
    }

    private static String normalizeEmail(String value) {
        String normalized = normalizeRequired(value, "email is required").toLowerCase(Locale.ROOT);
        if (!normalized.contains("@") || normalized.startsWith("@") || normalized.endsWith("@")) {
            throw new IllegalArgumentException("email must be a valid address");
        }
        return normalized;
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

    private record LoginChallenge(
            String email,
            UUID tenantId,
            Instant expiresAt
    ) {
    }
}
