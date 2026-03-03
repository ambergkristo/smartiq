package com.smartiq.backend.game;

public interface GameSessionStore {

    String read(String gameId);

    void write(String gameId, String payload);

    void delete(String gameId);
}
