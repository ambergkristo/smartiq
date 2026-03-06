package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.BillingProperties;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BillingServiceTest {

    @Test
    void rejectsMissingBillingProviderForCheckout() {
        BillingService service = fixtureWithProperties(new BillingProperties(
                null,
                "https://billing.smartiq.test/checkout",
                "https://app.smartiq.test/billing/success",
                "https://app.smartiq.test/billing/cancel",
                "test-webhook-secret",
                "X-SmartIQ-Billing-Signature"
        )).service();

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.initiateCheckout(
                        "owner@acme.test",
                        UUID.randomUUID(),
                        new BillingCheckoutRequest("pilot-monthly", "monthly")
                )
        );

        assertEquals("billing provider is not configured", error.getMessage());
    }

    @Test
    void rejectsLocalBillingProviderForCheckout() {
        BillingService service = fixtureWithProperties(new BillingProperties(
                "local",
                "https://billing.smartiq.test/checkout",
                "https://app.smartiq.test/billing/success",
                "https://app.smartiq.test/billing/cancel",
                "test-webhook-secret",
                "X-SmartIQ-Billing-Signature"
        )).service();

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.initiateCheckout(
                        "owner@acme.test",
                        UUID.randomUUID(),
                        new BillingCheckoutRequest("pilot-monthly", "monthly")
                )
        );

        assertEquals("billing provider must be an external provider, not a local/fake checkout", error.getMessage());
    }

    @Test
    void recordsCheckoutStartTelemetryForValidCheckout() {
        BillingServiceFixture fixture = fixtureWithProperties(new BillingProperties(
                "stripe",
                "https://billing.smartiq.test/checkout",
                "https://app.smartiq.test/billing/success",
                "https://app.smartiq.test/billing/cancel",
                "test-webhook-secret",
                "X-SmartIQ-Billing-Signature"
        ));
        UUID tenantId = UUID.randomUUID();

        BillingCheckoutResponse response = fixture.service().initiateCheckout(
                "owner@acme.test",
                tenantId,
                new BillingCheckoutRequest("pilot-monthly", "monthly")
        );

        assertEquals(tenantId, response.tenantId());
        verify(fixture.tenantService()).recordBillingCheckoutStarted(
                "owner@acme.test",
                tenantId,
                "pilot-monthly",
                "monthly"
        );
    }

    private BillingServiceFixture fixtureWithProperties(BillingProperties properties) {
        TenantService tenantService = mock(TenantService.class);
        TenantRepository tenantRepository = mock(TenantRepository.class);
        TenantBillingEventRepository tenantBillingEventRepository = mock(TenantBillingEventRepository.class);
        UUID tenantId = UUID.randomUUID();
        doReturn(new MeResponse(
                UUID.randomUUID(),
                "owner@acme.test",
                "Owner",
                tenantId,
                "owner",
                List.of(new MeTenantAccessResponse(tenantId, "acme", "Acme", "owner", "active"))
        )).when(tenantService).getMe(eq("owner@acme.test"), any(UUID.class));

        return new BillingServiceFixture(
                new BillingService(
                        tenantService,
                        tenantRepository,
                        tenantBillingEventRepository,
                        new ObjectMapper(),
                        properties
                ),
                tenantService
        );
    }

    private record BillingServiceFixture(
            BillingService service,
            TenantService tenantService
    ) {
    }
}
