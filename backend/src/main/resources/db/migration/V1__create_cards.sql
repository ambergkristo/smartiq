create table cards (
    id varchar(128) primary key,
    topic varchar(255) not null,
    subtopic varchar(255),
    language varchar(8) not null,
    question varchar(2000) not null,
    correct_index integer,
    correct_flags varchar(2000),
    difficulty varchar(32) not null,
    source varchar(512) not null,
    created_at timestamp with time zone not null
);

create table card_options (
    card_id varchar(128) not null,
    option_index integer not null,
    option_text varchar(1000) not null,
    primary key (card_id, option_index),
    constraint fk_card_options_card foreign key (card_id) references cards (id) on delete cascade
);

create index idx_cards_topic on cards (topic);
create index idx_cards_topic_lang on cards (topic, language);
create unique index uk_cards_topic_lang_question on cards (topic, language, question);