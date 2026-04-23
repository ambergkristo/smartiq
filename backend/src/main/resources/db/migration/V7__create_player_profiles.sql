create table player_profiles (
    id uuid primary key,
    guest_token varchar(160) not null unique,
    profile_json text not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index idx_player_profiles_updated_at on player_profiles (updated_at);
