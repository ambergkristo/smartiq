create table wl_tenants (
    id uuid primary key,
    slug varchar(80) not null unique,
    name varchar(160) not null,
    legal_entity_name varchar(200),
    billing_email varchar(320),
    status varchar(32) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index idx_wl_tenants_status on wl_tenants (status);

create table wl_tenant_branding (
    tenant_id uuid primary key,
    app_name varchar(160) not null,
    logo_url varchar(1024),
    primary_color varchar(16),
    secondary_color varchar(16),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_wl_tenant_branding_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade
);

create table wl_tenant_settings (
    tenant_id uuid primary key,
    settings_json text not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_wl_tenant_settings_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade
);

create table wl_users (
    id uuid primary key,
    email varchar(320) not null unique,
    display_name varchar(160),
    auth_provider varchar(32) not null,
    external_subject varchar(256),
    status varchar(32) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create table wl_memberships (
    id uuid primary key,
    tenant_id uuid not null,
    user_id uuid not null,
    role varchar(32) not null,
    status varchar(32) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_wl_memberships_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade,
    constraint fk_wl_memberships_user
        foreign key (user_id) references wl_users (id) on delete cascade,
    constraint uk_wl_memberships_tenant_user unique (tenant_id, user_id)
);

create index idx_wl_memberships_tenant_role on wl_memberships (tenant_id, role);

create table wl_subscriptions (
    id uuid primary key,
    tenant_id uuid not null,
    plan_code varchar(64) not null,
    status varchar(32) not null,
    billing_cycle varchar(32) not null,
    trial_ends_at timestamp with time zone,
    current_period_starts_at timestamp with time zone,
    current_period_ends_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_wl_subscriptions_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade
);

create index idx_wl_subscriptions_tenant_status on wl_subscriptions (tenant_id, status);

create table wl_usage_events (
    id uuid primary key,
    tenant_id uuid not null,
    event_type varchar(64) not null,
    event_value bigint not null,
    event_time timestamp with time zone not null,
    metadata_json text,
    created_at timestamp with time zone not null,
    constraint fk_wl_usage_events_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade
);

create index idx_wl_usage_events_tenant_type_time on wl_usage_events (tenant_id, event_type, event_time);

create table wl_audit_events (
    id uuid primary key,
    tenant_id uuid not null,
    actor_user_id uuid,
    action varchar(96) not null,
    entity_type varchar(96),
    entity_id varchar(128),
    metadata_json text,
    event_time timestamp with time zone not null,
    created_at timestamp with time zone not null,
    constraint fk_wl_audit_events_tenant
        foreign key (tenant_id) references wl_tenants (id) on delete cascade
);

create index idx_wl_audit_events_tenant_time on wl_audit_events (tenant_id, event_time);
