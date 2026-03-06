package com.smartiq.backend.tenant;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PatchMapping("/tenant-branding")
    public TenantBrandingRuntimeResponse updateTenantBranding(HttpServletRequest request,
                                                              @RequestBody(required = false) UpdateTenantBrandingRequest updateRequest) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.updateBrandingForMember(context.userEmail(), context.tenantId(), updateRequest);
    }

    @PutMapping("/session-templates/{templateId}")
    public TenantRuntimeSessionTemplatesResponse upsertSessionTemplate(HttpServletRequest request,
                                                                      @PathVariable String templateId,
                                                                      @RequestBody(required = false) RuntimeSessionTemplateUpsertRequest upsertRequest) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.upsertSessionTemplateForMember(context.userEmail(), context.tenantId(), templateId, upsertRequest);
    }

    @DeleteMapping("/session-templates/{templateId}")
    public TenantRuntimeSessionTemplatesResponse deleteSessionTemplate(HttpServletRequest request,
                                                                      @PathVariable String templateId) {
        ResolvedAuthContext context = authContextResolver.resolve(request);
        return tenantService.deleteSessionTemplateForMember(context.userEmail(), context.tenantId(), templateId);
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
