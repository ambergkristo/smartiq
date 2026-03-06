package com.smartiq.backend.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantBillingEventRepository extends JpaRepository<TenantBillingEvent, UUID> {

    boolean existsByEventId(String eventId);

    Optional<TenantBillingEvent> findTopByTenantIdOrderByOccurredAtDescReceivedAtDesc(UUID tenantId);
}
