package com.smartiq.backend.card;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface GameHistoryEntryRepository extends JpaRepository<GameHistoryEntry, Long> {

    @Query("select e from GameHistoryEntry e where e.gameId = :gameId order by e.id desc")
    List<GameHistoryEntry> findRecentByGameId(@Param("gameId") String gameId, Pageable pageable);

    long countByGameId(String gameId);

    @Query(value = """
            select id
            from game_history_entries
            where game_id = :gameId
            order by id asc
            limit :limit
            """, nativeQuery = true)
    List<Long> findOldestIds(@Param("gameId") String gameId, @Param("limit") int limit);

    @Modifying
    @Transactional
    void deleteByGameId(String gameId);
}
