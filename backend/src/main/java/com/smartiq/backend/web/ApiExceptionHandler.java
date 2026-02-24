package com.smartiq.backend.web;

import com.smartiq.backend.card.InvalidCardContractException;
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
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Object> handleNotFound(NoSuchElementException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(InvalidCardContractException.class)
    public ResponseEntity<Object> handleInvalidCardContract(InvalidCardContractException ex, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnhandled(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", request.getRequestURI());
    }

    private ResponseEntity<Object> build(HttpStatus status, String message, String path) {
        String resolvedMessage = Objects.requireNonNullElse(message, status.getReasonPhrase());
        Object body = legacyShapeEnabled
                ? ApiErrorResponse.legacy(resolvedMessage)
                : ApiErrorResponse.of(status, resolvedMessage, path);
        return ResponseEntity.status(status).body(body);
    }
}
