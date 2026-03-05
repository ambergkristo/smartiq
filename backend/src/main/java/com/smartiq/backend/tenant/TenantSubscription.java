package com.smartiq.backend.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wl_subscriptions")
public class TenantSubscription {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "plan_code", nullable = false, length = 64)
    private String planCode;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "billing_cycle", nullable = false, length = 32)
    private String billingCycle;

    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;

    @Column(name = "current_period_starts_at")
    private Instant currentPeriodStartsAt;

    @Column(name = "current_period_ends_at")
    private Instant currentPeriodEndsAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getBillingCycle() {
        return billingCycle;
    }

    public void setBillingCycle(String billingCycle) {
        this.billingCycle = billingCycle;
    }

    public Instant getTrialEndsAt() {
        return trialEndsAt;
    }

    public void setTrialEndsAt(Instant trialEndsAt) {
        this.trialEndsAt = trialEndsAt;
    }

    public Instant getCurrentPeriodStartsAt() {
        return currentPeriodStartsAt;
    }

    public void setCurrentPeriodStartsAt(Instant currentPeriodStartsAt) {
        this.currentPeriodStartsAt = currentPeriodStartsAt;
    }

    public Instant getCurrentPeriodEndsAt() {
        return currentPeriodEndsAt;
    }

    public void setCurrentPeriodEndsAt(Instant currentPeriodEndsAt) {
        this.currentPeriodEndsAt = currentPeriodEndsAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
