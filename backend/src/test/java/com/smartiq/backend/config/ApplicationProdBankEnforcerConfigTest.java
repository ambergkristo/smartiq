package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationProdBankEnforcerConfigTest {

    @Test
    void keepsBankValidationWarnOnlyByDefaultInBaseConfig() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.bank.block-on-low-bank"))
                .isEqualTo("${STRICT_BANK_VALIDATION:${SMARTIQ_BLOCK_ON_LOW_BANK:false}}");
    }

    @Test
    void keepsBankValidationWarnOnlyByDefaultInProdProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-prod.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("smartiq.bank.block-on-low-bank"))
                .isEqualTo("${STRICT_BANK_VALIDATION:${SMARTIQ_BLOCK_ON_LOW_BANK:false}}");
    }
}
