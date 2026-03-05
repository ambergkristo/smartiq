package com.smartiq.backend.tenant;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantUsageEventRepository extends JpaRepository<TenantUsageEvent, UUID> {

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

    @Query("""
            select new com.smartiq.backend.tenant.TenantUsageSummaryRow(
                e.eventType,
                coalesce(sum(e.eventValue), 0),
                count(e),
                min(e.eventTime),
                max(e.eventTime)
            )
            from TenantUsageEvent e
            where e.tenantId = :tenantId
              and (:fromInclusive is null or e.eventTime >= :fromInclusive)
              and (:toInclusive is null or e.eventTime <= :toInclusive)
              and (:eventType is null or e.eventType = :eventType)
            group by e.eventType
            order by e.eventType asc
            """)
    List<TenantUsageSummaryRow> summarizeByTenantId(
            @Param("tenantId") UUID tenantId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toInclusive") Instant toInclusive,
            @Param("eventType") String eventType
    );
}
