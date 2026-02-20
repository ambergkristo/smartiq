package com.smartiq.backend.card;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface CardRepository extends JpaRepository<Card, String> {

    @Query(value = "select * from cards where lower(topic) = lower(:topic) order by random() limit 1", nativeQuery = true)
    Optional<Card> findRandomByTopic(@Param("topic") String topic);

    @Query(value = """
            select * from cards
            where (:topic is null or lower(topic) = lower(:topic))
              and (:difficulty is null or lower(difficulty) = lower(:difficulty))
              and (:language is null or lower(language) = lower(:language))
            order by random()
            limit 1
            """, nativeQuery = true)
    Optional<Card> findRandomByFilters(@Param("topic") String topic,
                                       @Param("difficulty") String difficulty,
                                       @Param("language") String language);

    @Query(value = """
            select * from cards
            where (:topic is null or lower(topic) = lower(:topic))
              and (:difficulty is null or lower(difficulty) = lower(:difficulty))
              and (:language is null or lower(language) = lower(:language))
              and id not in (:excludedIds)
            order by random()
            limit 1
            """, nativeQuery = true)
    Optional<Card> findRandomByFiltersExcludingIds(@Param("topic") String topic,
                                                   @Param("difficulty") String difficulty,
                                                   @Param("language") String language,
                                                   @Param("excludedIds") Set<String> excludedIds);

    @Query(value = "select * from cards order by random() limit 1", nativeQuery = true)
    Optional<Card> findRandomOverall();

    @Query(value = """
            select * from cards
            where lower(language) = lower(:language)
              and (:topic is null or lower(topic) = lower(:topic))
              and lower(source) in (:allowedSources)
            """, nativeQuery = true)
    List<Card> findDeckPool(@Param("language") String language,
                            @Param("topic") String topic,
                            @Param("allowedSources") List<String> allowedSources);

    @Query(value = """
            select * from cards
            where lower(topic) = lower(:topic)
              and lower(difficulty) = lower(:difficulty)
              and lower(language) = lower(:language)
            """, nativeQuery = true)
    List<Card> findAllByPoolKey(@Param("topic") String topic,
                                @Param("difficulty") String difficulty,
                                @Param("language") String language);

    @Query(value = """
            select topic as topic, difficulty as difficulty, language as language
            from cards
            group by topic, difficulty, language
            """, nativeQuery = true)
    List<QuestionPoolKeyView> findAllPoolKeys();

    @Query(value = """
            select count(*)
            from cards
            where lower(topic) = lower(:topic)
              and lower(difficulty) = lower(:difficulty)
              and lower(language) = lower(:language)
            """, nativeQuery = true)
    long countByPoolKey(@Param("topic") String topic,
                        @Param("difficulty") String difficulty,
                        @Param("language") String language);

    @Query(value = "select topic as topic, count(*) as count from cards group by topic order by topic", nativeQuery = true)
    List<TopicCountView> findTopicCounts();

    @Query(value = "select category as label, count(*) as count from cards group by category order by category", nativeQuery = true)
    List<LabelCountView> findCategoryCounts();

    @Query(value = "select language as label, count(*) as count from cards group by language order by language", nativeQuery = true)
    List<LabelCountView> findLanguageCounts();

    @Query(value = "select count(*) from cards where lower(source) in (:sources)", nativeQuery = true)
    long countBySourcesLower(@Param("sources") List<String> sources);

    @Modifying
    @Transactional
    @Query(value = "delete from cards where lower(source) in (:sources)", nativeQuery = true)
    int deleteBySourcesLower(@Param("sources") List<String> sources);
}
