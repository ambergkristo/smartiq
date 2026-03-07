-- Seed Smart10-aligned fallback cards for environments without JSON import.
-- This migration is idempotent and safe to re-run.

insert into cards (id, topic, subtopic, category, language, question, correct_index, correct_flags, correct_meta, difficulty, source, created_at)
with recursive seq(n) as (
    select 1
    union all
    select n + 1 from seq where n < 10
),
topics(topic) as (
    select 'History'
    union all select 'Sports'
    union all select 'Geography'
    union all select 'Culture'
    union all select 'Science'
    union all select 'Varia'
),
categories(category, slug) as (
    select 'OPEN', 'open'
    union all select 'TRUE_FALSE', 'true-false'
    union all select 'NUMBER', 'number'
    union all select 'ORDER', 'order'
    union all select 'COLOR', 'color'
    union all select 'CENTURY_DECADE', 'century-decade'
),
cards_seed(id, topic, category, language, question, correct_index, correct_flags, correct_meta, difficulty, source, created_at) as (
    select
        lower(topic) || '-' || slug || '-seed-en-' || lpad(cast(n as varchar), 2, '0') as id,
        topic,
        category,
        'en' as language,
        topic || ' ' || replace(slug, '-', ' ') || ' seed question #' || cast(n as varchar) || ': choose the matching code.' as question,
        case
            when category in ('OPEN', 'NUMBER', 'COLOR', 'CENTURY_DECADE') then mod(n - 1, 10)
            else cast(null as integer)
        end as correct_index,
        case
            when category = 'TRUE_FALSE' then
                case mod(n - 1, 5)
                    when 0 then 'true,false,false,false,false,false,false,false,false,false'
                    when 1 then 'false,true,false,false,false,false,false,false,false,false'
                    when 2 then 'false,false,true,false,false,false,false,false,false,false'
                    when 3 then 'false,false,false,true,false,false,false,false,false,false'
                    else 'false,false,false,false,true,false,false,false,false,false'
                end
            else cast(null as varchar)
        end as correct_flags,
        case
            when category = 'ORDER' then '{"rankByIndex":[0,1,2,3,4,5,6,7,8,9]}'
            else cast(null as varchar)
        end as correct_meta,
        '1' as difficulty,
        'flyway-seed-core' as source,
        current_timestamp as created_at
    from topics
    cross join categories
    cross join seq
)
select
    cs.id,
    cs.topic,
    cs.category,
    cs.category,
    cs.language,
    cs.question,
    cs.correct_index,
    cs.correct_flags,
    cs.correct_meta,
    cs.difficulty,
    cs.source,
    cs.created_at
from cards_seed cs
left join cards c on c.id = cs.id
where lower('${seed_core_enabled}') = 'true'
  and c.id is null;

insert into card_options (card_id, option_index, option_text)
with recursive seq(n) as (
    select 1
    union all
    select n + 1 from seq where n < 10
),
opt(i) as (
    select 0
    union all
    select i + 1 from opt where i < 9
),
topics(topic) as (
    select 'History'
    union all select 'Sports'
    union all select 'Geography'
    union all select 'Culture'
    union all select 'Science'
    union all select 'Varia'
),
categories(category, slug) as (
    select 'OPEN', 'open'
    union all select 'TRUE_FALSE', 'true-false'
    union all select 'NUMBER', 'number'
    union all select 'ORDER', 'order'
    union all select 'COLOR', 'color'
    union all select 'CENTURY_DECADE', 'century-decade'
),
cards_seed(id, topic, category, n) as (
    select
        lower(topic) || '-' || slug || '-seed-en-' || lpad(cast(n as varchar), 2, '0') as id,
        topic,
        category,
        n
    from topics
    cross join categories
    cross join seq
)
select
    cs.id as card_id,
    opt.i as option_index,
    case
        when cs.category = 'ORDER' then 'Rank slot ' || cast(opt.i + 1 as varchar)
        when opt.i = mod(cs.n - 1, 10) then 'Correct code ' || cast(opt.i + 1 as varchar)
        else 'Distractor ' || cast(opt.i + 1 as varchar)
    end as option_text
from cards_seed cs
cross join opt
left join card_options existing
       on existing.card_id = cs.id and existing.option_index = opt.i
where lower('${seed_core_enabled}') = 'true'
  and existing.card_id is null;
