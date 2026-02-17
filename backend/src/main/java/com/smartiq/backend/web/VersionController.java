package com.smartiq.backend.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class VersionController {

    @Value("${smartiq.build.commit-sha:unknown}")
    private String commitSha;

    @Value("${smartiq.build.time:unknown}")
    private String buildTime;

    @GetMapping("/version")
    public Map<String, String> version() {
        return Map.of(
                "commitSha", commitSha,
                "buildTime", buildTime
        );
    }
}