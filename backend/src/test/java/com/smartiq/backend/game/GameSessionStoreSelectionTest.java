package com.smartiq.backend.game;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GameSessionStoreSelectionTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(
                    InMemoryGameSessionStore.class,
                    RedisGameSessionStore.class,
                    TestDependencies.class
            );

    @Test
    void defaultsToInMemoryStore() {
        contextRunner.run((context) -> {
            assertThat(context).hasSingleBean(GameSessionStore.class);
            assertThat(context.getBean(GameSessionStore.class)).isInstanceOf(InMemoryGameSessionStore.class);
        });
    }

    @Test
    void usesRedisStoreWhenConfigured() {
        contextRunner
                .withPropertyValues("smartiq.game.session-store=redis")
                .run((context) -> {
                    assertThat(context).hasSingleBean(GameSessionStore.class);
                    assertThat(context.getBean(GameSessionStore.class)).isInstanceOf(RedisGameSessionStore.class);
                });
    }

    @Configuration(proxyBeanMethods = false)
    static class TestDependencies {
        @Bean
        StringRedisTemplate stringRedisTemplate() {
            return mock(StringRedisTemplate.class);
        }
    }
}
