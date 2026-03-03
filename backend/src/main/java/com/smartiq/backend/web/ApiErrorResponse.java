package com.smartiq.backend.web;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String error,
        String reason,
        String path
) {
    public static ApiErrorResponse of(HttpStatus status, String message, String path) {
        return of(status, defaultCode(status), message, path);
    }

    public static ApiErrorResponse of(HttpStatus status, String code, String message, String path) {
        return new ApiErrorResponse(
                Instant.now(),
                status.value(),
                code,
                message,
                status.getReasonPhrase(),
                path
        );
    }

    public static Map<String, String> legacy(String message) {
        return Map.of("error", message);
    }

    private static String defaultCode(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> "INVALID_ACTION";
            case FORBIDDEN -> "FORBIDDEN_ACTOR";
            case NOT_FOUND -> "NOT_FOUND";
            case CONFLICT -> "DUPLICATE_ACTION";
            case TOO_MANY_REQUESTS -> "RATE_LIMITED";
            default -> "INTERNAL_ERROR";
        };
    }
}
