package com.smartiq.backend.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantMembershipRepository extends JpaRepository<TenantMembership, UUID> {

    boolean existsByTenantIdAndUserId(UUID tenantId, UUID userId);

    Optional<TenantMembership> findByTenantIdAndUserId(UUID tenantId, UUID userId);

    Optional<TenantMembership> findByIdAndTenantId(UUID id, UUID tenantId);

    long countByTenantIdAndRoleAndStatus(UUID tenantId, String role, String status);

    List<TenantMembership> findByTenantIdOrderByCreatedAtAsc(UUID tenantId);

    List<TenantMembership> findByUserIdOrderByCreatedAtAsc(UUID userId);
}
