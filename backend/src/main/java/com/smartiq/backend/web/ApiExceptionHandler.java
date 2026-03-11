package com.smartiq.backend.web;

import com.smartiq.backend.card.InvalidCardContractException;
import com.smartiq.backend.game.DuplicateGameActionException;
import com.smartiq.backend.game.ForbiddenGameActionException;
import com.smartiq.backend.tenant.DuplicateTenantMembershipException;
import com.smartiq.backend.tenant.ForbiddenTenantAccessException;
import com.smartiq.backend.tenant.LastOwnerProtectionException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.NoSuchElementException;
import java.util.Objects;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final String CODE_INVALID_ACTION = "INVALID_ACTION";
    private static final String CODE_INVALID_ROOM_REQUEST = "INVALID_ROOM_REQUEST";
    private static final String CODE_INVALID_ROOM_TOKEN = "INVALID_ROOM_TOKEN";
    private static final String CODE_INVALID_TENANT_REQUEST = "INVALID_TENANT_REQUEST";
    private static final String CODE_INVALID_AUTH_CONTEXT = "INVALID_AUTH_CONTEXT";
    private static final String CODE_INVALID_BILLING_EVENT = "INVALID_BILLING_EVENT";
    private static final String CODE_PLAN_LIMIT_REACHED = "PLAN_LIMIT_REACHED";
    private static final String CODE_GAME_NOT_FOUND = "GAME_NOT_FOUND";
    private static final String CODE_ROOM_NOT_FOUND = "ROOM_NOT_FOUND";
    private static final String CODE_PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND";
    private static final String CODE_TENANT_NOT_FOUND = "TENANT_NOT_FOUND";
    private static final String CODE_USER_NOT_FOUND = "USER_NOT_FOUND";
    private static final String CODE_MEMBERSHIP_NOT_FOUND = "MEMBERSHIP_NOT_FOUND";
    private static final String CODE_FORBIDDEN_ACTOR = "FORBIDDEN_ACTOR";
    private static final String CODE_FORBIDDEN_TENANT_ACCESS = "FORBIDDEN_TENANT_ACCESS";
    private static final String CODE_DUPLICATE_ACTION = "DUPLICATE_ACTION";
    private static final String CODE_DUPLICATE_MEMBERSHIP = "DUPLICATE_MEMBERSHIP";
    private static final String CODE_LAST_OWNER_PROTECTION = "LAST_OWNER_PROTECTION";
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

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Object> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex,
                                                         HttpServletRequest request) {
        return build(
                HttpStatus.METHOD_NOT_ALLOWED,
                CODE_INVALID_ACTION,
                ex.getMessage(),
                request.getRequestURI()
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Object> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        String path = request.getRequestURI();
        return build(HttpStatus.NOT_FOUND, resolveNotFoundCode(path, ex.getMessage()), ex.getMessage(), path);
    }

    @ExceptionHandler(ForbiddenGameActionException.class)
    public ResponseEntity<Object> handleForbiddenAction(ForbiddenGameActionException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, CODE_FORBIDDEN_ACTOR, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(ForbiddenTenantAccessException.class)
    public ResponseEntity<Object> handleForbiddenTenantAccess(ForbiddenTenantAccessException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, CODE_FORBIDDEN_TENANT_ACCESS, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(DuplicateGameActionException.class)
    public ResponseEntity<Object> handleDuplicateAction(DuplicateGameActionException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, CODE_DUPLICATE_ACTION, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(DuplicateTenantMembershipException.class)
    public ResponseEntity<Object> handleDuplicateMembership(DuplicateTenantMembershipException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, CODE_DUPLICATE_MEMBERSHIP, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(LastOwnerProtectionException.class)
    public ResponseEntity<Object> handleLastOwnerProtection(LastOwnerProtectionException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, CODE_LAST_OWNER_PROTECTION, ex.getMessage(), request.getRequestURI());
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
        if (normalizedMessage.contains("plan limit reached")) {
            return CODE_PLAN_LIMIT_REACHED;
        }
        if (normalizedPath.startsWith("/internal/wl/")) {
            return CODE_INVALID_TENANT_REQUEST;
        }
        if (normalizedPath.startsWith("/api/me") || normalizedPath.startsWith("/api/auth")) {
            return CODE_INVALID_AUTH_CONTEXT;
        }
        if (normalizedPath.startsWith("/api/billing")) {
            return CODE_INVALID_BILLING_EVENT;
        }
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
        if (normalizedPath.startsWith("/internal/wl/")) {
            return CODE_TENANT_NOT_FOUND;
        }
        if (normalizedPath.startsWith("/api/me") || normalizedPath.startsWith("/api/auth")) {
            if (normalizedMessage.contains("tenant not found")) {
                return CODE_TENANT_NOT_FOUND;
            }
            if (normalizedMessage.contains("membership not found")) {
                return CODE_MEMBERSHIP_NOT_FOUND;
            }
            return CODE_USER_NOT_FOUND;
        }
        return CODE_NOT_FOUND;
    }
}
