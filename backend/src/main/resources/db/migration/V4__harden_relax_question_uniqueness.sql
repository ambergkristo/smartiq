-- Some environments may still carry a legacy unique constraint/index from early schema versions.
-- Keep question lookup performant, but never enforce uniqueness on (topic, language, question).
alter table cards drop constraint if exists uk_cards_topic_lang_question;
drop index if exists uk_cards_topic_lang_question;

create index if not exists idx_cards_topic_lang_question
    on cards (topic, language, question);
