package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationProdImportGateConfigTest {

    @Test
    void disablesImportThresholdFailFastByDefaultInProdProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-prod.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.import.fail-on-category-threshold"))
                .isEqualTo("${STRICT_DATASET_VALIDATION:${SMARTIQ_IMPORT_FAIL_ON_CATEGORY_THRESHOLD:false}}");
    }

    @Test
    void enablesImportThresholdFailFastByDefaultInLocalProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-local.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.import.fail-on-category-threshold"))
                .isEqualTo("${STRICT_DATASET_VALIDATION:${SMARTIQ_IMPORT_FAIL_ON_CATEGORY_THRESHOLD:true}}");
    }

    @Test
    void enablesImportThresholdFailFastByDefaultInDevProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-dev.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.import.fail-on-category-threshold"))
                .isEqualTo("${STRICT_DATASET_VALIDATION:${SMARTIQ_IMPORT_FAIL_ON_CATEGORY_THRESHOLD:true}}");
    }
}
