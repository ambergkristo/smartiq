create table wl_billing_events (
    id uuid primary key,
    event_id varchar(128) not null unique,
    tenant_id uuid not null,
    event_type varchar(96) not null,
    event_status varchar(32) not null,
    occurred_at timestamp with time zone not null,
    received_at timestamp with time zone not null,
    payload_json text,
    constraint fk_wl_billing_events_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade
);

create index idx_wl_billing_events_tenant_time on wl_billing_events (tenant_id, occurred_at, received_at);
