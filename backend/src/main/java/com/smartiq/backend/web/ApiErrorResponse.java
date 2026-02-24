package com.smartiq.backend.web;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String reason,
        String path
) {
    public static ApiErrorResponse of(HttpStatus status, String message, String path) {
        return new ApiErrorResponse(
                Instant.now(),
                status.value(),
                message,
                status.getReasonPhrase(),
                path
        );
    }

    public static Map<String, String> legacy(String message) {
        return Map.of("error", message);
    }
}
