package com.smartiq.backend.tenant;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class TenantBillingController {

    private final BillingService billingService;
    private final AuthContextResolver authContextResolver;

    public TenantBillingController(BillingService billingService, AuthContextResolver authContextResolver) {
        this.billingService = billingService;
        this.authContextResolver = authContextResolver;
    }

    @PostMapping("/checkout")
    public BillingCheckoutResponse initiateCheckout(@RequestBody(required = false) BillingCheckoutRequest request,
                                                    HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolve(httpServletRequest);
        return billingService.initiateCheckout(context.userEmail(), context.tenantId(), request);
    }

    @PostMapping("/webhook")
    public BillingWebhookResponse ingestWebhook(@RequestBody(required = false) String rawPayload,
                                                HttpServletRequest httpServletRequest) {
        billingService.verifyWebhookSignature(
                rawPayload,
                httpServletRequest.getHeader(billingService.resolveWebhookSignatureHeaderName())
        );
        return billingService.ingestWebhook(billingService.parseWebhookPayload(rawPayload));
    }
}
