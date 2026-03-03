package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationProdSessionCapacityGuardrailsConfigTest {

    @Test
    void pinsSessionRetentionAndCapacityGuardrailsInProdProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-prod.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.game.session-retention-minutes"))
                .isEqualTo("${SMARTIQ_GAME_SESSION_RETENTION_MINUTES:180}");
        assertThat(properties.getProperty("smartiq.game.session-max"))
                .isEqualTo("${SMARTIQ_GAME_SESSION_MAX:50000}");
        assertThat(properties.getProperty("smartiq.room.room-retention-minutes"))
                .isEqualTo("${SMARTIQ_ROOM_RETENTION_MINUTES:180}");
        assertThat(properties.getProperty("smartiq.room.room-max"))
                .isEqualTo("${SMARTIQ_ROOM_MAX:20000}");
    }
}
