package com.smartiq.backend.room;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RoomSessionStoreSelectionTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(
                    InMemoryRoomSessionStore.class,
                    RedisRoomSessionStore.class,
                    TestDependencies.class
            );

    @Test
    void defaultsToInMemoryStore() {
        contextRunner.run((context) -> {
            assertThat(context).hasSingleBean(RoomSessionStore.class);
            assertThat(context.getBean(RoomSessionStore.class)).isInstanceOf(InMemoryRoomSessionStore.class);
        });
    }

    @Test
    void usesRedisStoreWhenConfigured() {
        contextRunner
                .withPropertyValues("smartiq.room.session-store=redis")
                .run((context) -> {
                    assertThat(context).hasSingleBean(RoomSessionStore.class);
                    assertThat(context.getBean(RoomSessionStore.class)).isInstanceOf(RedisRoomSessionStore.class);
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
