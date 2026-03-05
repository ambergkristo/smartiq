package com.smartiq.backend.tenant;

public class DuplicateTenantMembershipException extends RuntimeException {

    public DuplicateTenantMembershipException(String message) {
        super(message);
    }
}
