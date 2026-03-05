package com.smartiq.backend.tenant;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TenantAuditEventRepository extends JpaRepository<TenantAuditEvent, UUID> {

    long countByTenantId(UUID tenantId);

    List<TenantAuditEvent> findByTenantId(UUID tenantId, Pageable pageable);
}
