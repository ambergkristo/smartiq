package com.smartiq.backend.tenant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class TenantAuthController {

    private final TenantAuthService tenantAuthService;

    public TenantAuthController(TenantAuthService tenantAuthService) {
        this.tenantAuthService = tenantAuthService;
    }

    @PostMapping("/request-link")
    public AuthRequestLinkResponse requestLink(@RequestBody(required = false) AuthRequestLinkRequest request) {
        return tenantAuthService.requestLink(request);
    }

    @PostMapping("/complete")
    public AuthCompleteResponse complete(@RequestBody(required = false) AuthCompleteRequest request) {
        return tenantAuthService.complete(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
    }
}
