alter table cards
    add column if not exists category varchar(32) not null default 'OPEN';

alter table cards
    add column if not exists correct_meta varchar(4000);

update cards
set category = upper(coalesce(subtopic, 'OPEN'))
where category is null or category = '';

update cards
set category = 'OPEN'
where category not in ('TRUE_FALSE', 'NUMBER', 'ORDER', 'CENTURY_DECADE', 'COLOR', 'OPEN');

create index if not exists idx_cards_category on cards (category);
create index if not exists idx_cards_topic_category on cards (topic, category);
