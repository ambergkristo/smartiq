package com.smartiq.backend.room;

public class RoomClosedException extends RuntimeException {

    public RoomClosedException(String message) {
        super(message);
    }
}
