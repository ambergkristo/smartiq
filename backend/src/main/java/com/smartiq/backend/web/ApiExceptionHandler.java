package com.smartiq.backend.web;

import com.smartiq.backend.card.InvalidCardContractException;
import com.smartiq.backend.game.DuplicateGameActionException;
import com.smartiq.backend.game.ForbiddenGameActionException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.NoSuchElementException;
import java.util.Objects;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final String CODE_INVALID_ACTION = "INVALID_ACTION";
    private static final String CODE_INVALID_ROOM_REQUEST = "INVALID_ROOM_REQUEST";
    private static final String CODE_INVALID_ROOM_TOKEN = "INVALID_ROOM_TOKEN";
    private static final String CODE_GAME_NOT_FOUND = "GAME_NOT_FOUND";
    private static final String CODE_ROOM_NOT_FOUND = "ROOM_NOT_FOUND";
    private static final String CODE_PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND";
    private static final String CODE_FORBIDDEN_ACTOR = "FORBIDDEN_ACTOR";
    private static final String CODE_DUPLICATE_ACTION = "DUPLICATE_ACTION";
    private static final String CODE_INTERNAL_ERROR = "INTERNAL_ERROR";
    private static final String CODE_NOT_FOUND = "NOT_FOUND";

    private final boolean legacyShapeEnabled;

    public ApiExceptionHandler(@Value("${smartiq.api.errors.legacy-shape-enabled:false}") boolean legacyShapeEnabled) {
        this.legacyShapeEnabled = legacyShapeEnabled;
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            ConstraintViolationException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<Object> handleBadRequest(Exception ex, HttpServletRequest request) {
        String path = request.getRequestURI();
        return build(HttpStatus.BAD_REQUEST, resolveBadRequestCode(path, ex.getMessage()), ex.getMessage(), path);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Object> handleNotFound(NoSuchElementException ex, HttpServletRequest request) {
        String path = request.getRequestURI();
        String code = resolveNotFoundCode(path, ex.getMessage());
        return build(HttpStatus.NOT_FOUND, code, ex.getMessage(), path);
    }

    @ExceptionHandler(ForbiddenGameActionException.class)
    public ResponseEntity<Object> handleForbiddenAction(ForbiddenGameActionException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, CODE_FORBIDDEN_ACTOR, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(DuplicateGameActionException.class)
    public ResponseEntity<Object> handleDuplicateAction(DuplicateGameActionException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, CODE_DUPLICATE_ACTION, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(InvalidCardContractException.class)
    public ResponseEntity<Object> handleInvalidCardContract(InvalidCardContractException ex, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, CODE_INTERNAL_ERROR, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnhandled(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, CODE_INTERNAL_ERROR, "Unexpected server error", request.getRequestURI());
    }

    private ResponseEntity<Object> build(HttpStatus status, String message, String path) {
        return build(status, null, message, path);
    }

    private ResponseEntity<Object> build(HttpStatus status, String code, String message, String path) {
        String resolvedMessage = Objects.requireNonNullElse(message, status.getReasonPhrase());
        Object body = legacyShapeEnabled
                ? ApiErrorResponse.legacy(resolvedMessage)
                : code == null
                ? ApiErrorResponse.of(status, resolvedMessage, path)
                : ApiErrorResponse.of(status, code, resolvedMessage, path);
        return ResponseEntity.status(status).body(body);
    }

    private static String resolveBadRequestCode(String path, String message) {
        String normalizedPath = path == null ? "" : path;
        String normalizedMessage = message == null ? "" : message.trim().toLowerCase();
        if (!normalizedPath.startsWith("/api/rooms/")) {
            return CODE_INVALID_ACTION;
        }
        if (normalizedMessage.contains("invalid room token")) {
            return CODE_INVALID_ROOM_TOKEN;
        }
        return CODE_INVALID_ROOM_REQUEST;
    }

    private static String resolveNotFoundCode(String path, String message) {
        String normalizedPath = path == null ? "" : path;
        String normalizedMessage = message == null ? "" : message.trim().toLowerCase();
        if (normalizedPath.startsWith("/api/game/")) {
            return CODE_GAME_NOT_FOUND;
        }
        if (normalizedPath.startsWith("/api/rooms/")) {
            if (normalizedMessage.contains("player not found")) {
                return CODE_PLAYER_NOT_FOUND;
            }
            return CODE_ROOM_NOT_FOUND;
        }
        return CODE_NOT_FOUND;
    }
}
