package com.smartiq.backend.tenant;

public class ForbiddenTenantAccessException extends RuntimeException {

    public ForbiddenTenantAccessException(String message) {
        super(message);
    }
}
