drop index if exists uk_cards_topic_lang_question;

create index if not exists idx_cards_topic_lang_question
    on cards (topic, language, question);
