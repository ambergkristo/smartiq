package com.smartiq.backend.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TenantBrandingRepository extends JpaRepository<TenantBranding, UUID> {
}
