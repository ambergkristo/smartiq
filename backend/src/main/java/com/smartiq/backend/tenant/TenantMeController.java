package com.smartiq.backend.tenant;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class TenantMeController {

    private final TenantService tenantService;
    private final AuthContextResolver authContextResolver;

    public TenantMeController(TenantService tenantService, AuthContextResolver authContextResolver) {
        this.tenantService = tenantService;
        this.authContextResolver = authContextResolver;
    }

    @GetMapping
    public MeResponse getMe(HttpServletRequest request) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.getMe(context.userEmail(), context.tenantId());
    }

    @GetMapping("/tenant-settings")
    public TenantSettingsResponse getTenantSettings(HttpServletRequest request) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.getTenantSettingsForMember(context.userEmail(), context.tenantId());
    }

    @GetMapping("/tenant-branding")
    public TenantBrandingRuntimeResponse getTenantBranding(HttpServletRequest request) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.getTenantBrandingForMember(context.userEmail(), context.tenantId());
    }

    @GetMapping("/tenant-subscription")
    public TenantSubscriptionResponse getTenantSubscription(HttpServletRequest request) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.getTenantSubscriptionForMember(context.userEmail(), context.tenantId());
    }

    @GetMapping("/tenant-capabilities")
    public TenantRuntimeCapabilitiesResponse getTenantCapabilities(HttpServletRequest request) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.getTenantCapabilitiesForMember(context.userEmail(), context.tenantId());
    }

    @GetMapping("/tenant-audit-events")
    public List<TenantAuditEventResponse> listTenantAuditEvents(HttpServletRequest request,
                                                                @RequestParam(required = false) Integer limit) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.listTenantAuditEventsForMember(context.userEmail(), context.tenantId(), limit);
    }

    @GetMapping("/tenant-usage-summary")
    public List<TenantUsageSummaryResponse> getTenantUsageSummary(HttpServletRequest request,
                                                                  @RequestParam(required = false) String eventType,
                                                                  @RequestParam(required = false) String from,
                                                                  @RequestParam(required = false) String to) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.getTenantUsageSummaryForMember(context.userEmail(), context.tenantId(), eventType, from, to);
    }
}
