package com.smartiq.backend.game;

public class ForbiddenGameActionException extends RuntimeException {
    public ForbiddenGameActionException(String message) {
        super(message);
    }
}
