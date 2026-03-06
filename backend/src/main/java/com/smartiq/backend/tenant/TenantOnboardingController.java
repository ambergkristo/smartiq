package com.smartiq.backend.tenant;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/onboarding")
public class TenantOnboardingController {

    private final TenantService tenantService;

    public TenantOnboardingController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping("/bootstrap")
    public OnboardingBootstrapResponse bootstrap(@RequestBody(required = false) OnboardingBootstrapRequest request) {
        return tenantService.bootstrapOnboarding(request);
    }
}
