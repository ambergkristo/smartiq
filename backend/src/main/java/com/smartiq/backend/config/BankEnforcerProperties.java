package com.smartiq.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartiq.bank")
public record BankEnforcerProperties(
        int minSize,
        boolean blockOnLowBank,
        boolean triggerPipelineOnLowBank,
        String pipelineCommand
) {
}