package com.smartiq.backend.tenant;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantUsageEventRepository extends JpaRepository<TenantUsageEvent, UUID> {

    List<TenantUsageEvent> findAllByTenantId(UUID tenantId);

    List<TenantUsageEvent> findByTenantId(UUID tenantId, Pageable pageable);

    List<TenantUsageEvent> findByTenantIdAndEventType(UUID tenantId, String eventType, Pageable pageable);

    @Query("""
            select coalesce(sum(e.eventValue), 0)
            from TenantUsageEvent e
            where e.tenantId = :tenantId
              and e.eventTime >= :fromInclusive
              and e.eventTime < :toExclusive
            """)
    long sumEventValueByTenantIdAndEventTimeRange(
            @Param("tenantId") UUID tenantId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

}
