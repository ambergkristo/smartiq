package com.smartiq.backend.room;

public interface RoomSessionStore {

    String read(String roomCode);

    void write(String roomCode, String payload);

    void delete(String roomCode);
}
