package com.smartiq.backend.card;

import com.smartiq.backend.config.BankEnforcerProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@Profile("!prod")
@RequestMapping("/api/admin")
public class AdminGenerationController {

    private final BankEnforcerProperties bankEnforcerProperties;

    public AdminGenerationController(BankEnforcerProperties bankEnforcerProperties) {
        this.bankEnforcerProperties = bankEnforcerProperties;
    }

    @PostMapping("/generate-cards")
    public ResponseEntity<?> triggerGeneration() {
        List<String> command = resolveCommand();
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.directory(Path.of("..").toFile());
            Process process = builder.start();
            int code = process.waitFor();
            return ResponseEntity.ok(Map.of("status", "completed", "exitCode", code, "command", String.join(" ", command)));
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return ResponseEntity.internalServerError().body(Map.of("status", "failed", "error", ex.getMessage()));
        }
    }

    private List<String> resolveCommand() {
        String configured = bankEnforcerProperties.pipelineCommand();
        if (configured == null || configured.isBlank()) {
            return List.of("npm", "run", "pipeline:cards");
        }
        return List.of(configured.split("\\s+"));
    }
}