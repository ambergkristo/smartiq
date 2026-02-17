package com.smartiq.backend.card;

import com.smartiq.backend.config.BankEnforcerProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
public class BankSizeEnforcer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BankSizeEnforcer.class);

    private final CardRepository cardRepository;
    private final BankEnforcerProperties properties;
    private final Environment environment;

    public BankSizeEnforcer(CardRepository cardRepository,
                            BankEnforcerProperties properties,
                            Environment environment) {
        this.cardRepository = cardRepository;
        this.properties = properties;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> lowBankKeys = new ArrayList<>();

        for (QuestionPoolKeyView key : cardRepository.findAllPoolKeys()) {
            long count = cardRepository.countByPoolKey(key.getTopic(), key.getDifficulty(), key.getLanguage());
            if (count < properties.minSize()) {
                String keyText = String.format("%s|%s|%s", key.getTopic(), key.getDifficulty(), key.getLanguage());
                lowBankKeys.add(keyText);
                log.warn("bank_low topic={} difficulty={} language={} available={} required={}",
                        key.getTopic(), key.getDifficulty(), key.getLanguage(), count, properties.minSize());
            }
        }

        if (lowBankKeys.isEmpty()) {
            return;
        }

        if (properties.triggerPipelineOnLowBank() && isDevProfile()) {
            triggerPipeline();
        }

        if (properties.blockOnLowBank()) {
            throw new IllegalStateException("Bank size below minimum for keys: " + String.join(",", lowBankKeys));
        }
    }

    private boolean isDevProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if ("dev".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    private void triggerPipeline() {
        try {
            ProcessBuilder builder = new ProcessBuilder(resolveCommand());
            builder.directory(resolveRepoRoot().toFile());
            builder.inheritIO();
            Process process = builder.start();
            int code = process.waitFor();
            log.info("bank_low pipeline_triggered command='{}' exitCode={}", properties.pipelineCommand(), code);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Pipeline trigger interrupted: {}", properties.pipelineCommand(), ex);
        } catch (IOException ex) {
            log.error("Failed to trigger pipeline command: {}", properties.pipelineCommand(), ex);
        }
    }

    private List<String> resolveCommand() {
        String command = properties.pipelineCommand();
        if (command == null || command.isBlank()) {
            return List.of("npm", "run", "pipeline:cards");
        }
        return List.of(command.split("\\s+"));
    }

    private Path resolveRepoRoot() {
        Path current = Path.of("").toAbsolutePath().normalize();
        if (current.resolve("package.json").toFile().exists()) {
            return current;
        }
        if (current.getFileName() != null && "backend".equalsIgnoreCase(current.getFileName().toString())) {
            return current.getParent();
        }
        return current;
    }
}
