package com.smartiq.backend.card;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GameHistoryStoreSelectionTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(
                    InMemoryGameHistoryStore.class,
                    RedisGameHistoryStore.class,
                    TestDependencies.class
            );

    @Test
    void defaultsToInMemoryStore() {
        contextRunner.run((context) -> {
            assertThat(context).hasSingleBean(GameHistoryStore.class);
            assertThat(context.getBean(GameHistoryStore.class)).isInstanceOf(InMemoryGameHistoryStore.class);
        });
    }

    @Test
    void usesRedisStoreWhenConfigured() {
        contextRunner
                .withPropertyValues("smartiq.session.store=redis")
                .run((context) -> {
                    assertThat(context).hasSingleBean(GameHistoryStore.class);
                    assertThat(context.getBean(GameHistoryStore.class)).isInstanceOf(RedisGameHistoryStore.class);
                });
    }

    @Configuration(proxyBeanMethods = false)
    static class TestDependencies {
        @Bean
        StringRedisTemplate stringRedisTemplate() {
            return mock(StringRedisTemplate.class);
        }

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }
}
