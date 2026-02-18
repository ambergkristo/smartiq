-- Seed minimal core data for local/prod environments.
-- This migration is idempotent and safe to re-run.

insert into cards (id, topic, subtopic, language, question, correct_index, correct_flags, difficulty, source, created_at)
with recursive seq(n) as (
    select 1
    union all
    select n + 1 from seq where n < 20
),
topics(topic) as (
    select 'Math'
    union all select 'Science'
    union all select 'History'
    union all select 'Geography'
    union all select 'Sports'
    union all select 'Culture'
),
cards_seed(id, topic, subtopic, language, question, correct_index, correct_flags, difficulty, source, created_at) as (
    select
        lower(replace(topic, ' ', '-')) || '-seed-en-' || lpad(cast(n as varchar), 2, '0') as id,
        topic,
        cast(null as varchar) as subtopic,
        'en' as language,
        topic || ' sample question #' || cast(n as varchar) as question,
        0 as correct_index,
        cast(null as varchar) as correct_flags,
        case
            when mod(n, 3) = 1 then '1'
            when mod(n, 3) = 2 then '2'
            else '3'
        end as difficulty,
        'flyway-seed-core' as source,
        current_timestamp as created_at
    from topics
    cross join seq
)
select
    cs.id,
    cs.topic,
    cs.subtopic,
    cs.language,
    cs.question,
    cs.correct_index,
    cs.correct_flags,
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
    select n + 1 from seq where n < 20
),
opt(i) as (
    select 0
    union all
    select i + 1 from opt where i < 9
),
topics(topic) as (
    select 'Math'
    union all select 'Science'
    union all select 'History'
    union all select 'Geography'
    union all select 'Sports'
    union all select 'Culture'
),
cards_seed(id, topic, n) as (
    select
        lower(replace(topic, ' ', '-')) || '-seed-en-' || lpad(cast(n as varchar), 2, '0') as id,
        topic,
        n
    from topics
    cross join seq
)
select
    cs.id as card_id,
    opt.i as option_index,
    case
        when opt.i = 0 then 'Correct answer for ' || cs.topic || ' #' || cast(cs.n as varchar)
        else 'Option ' || cast(opt.i + 1 as varchar) || ' for ' || cs.topic || ' #' || cast(cs.n as varchar)
    end as option_text
from cards_seed cs
cross join opt
left join card_options existing
       on existing.card_id = cs.id and existing.option_index = opt.i
where lower('${seed_core_enabled}') = 'true'
  and existing.card_id is null;
