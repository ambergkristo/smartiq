package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationProdRoomSessionStoreConfigTest {

    @Test
    void defaultsRoomSessionStoreToMemoryInProdProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-prod.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.room.session-store"))
                .isEqualTo("${SMARTIQ_ROOM_SESSION_STORE:memory}");
    }
}
