package com.smartiq.backend.card;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GameHistoryStoreConfig {

    @Bean
    public GameHistoryStore gameHistoryStore(
            GameHistoryEntryRepository repository,
            @Value("${smartiq.deck-history.store:in-memory}") String storeType) {
        if ("db".equalsIgnoreCase(storeType)) {
            return new JpaGameHistoryStore(repository);
        }
        return new InMemoryGameHistoryStore();
    }
}
