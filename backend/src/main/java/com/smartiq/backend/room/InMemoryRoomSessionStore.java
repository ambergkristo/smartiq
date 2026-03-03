package com.smartiq.backend.room;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
@ConditionalOnProperty(name = "smartiq.room.session-store", havingValue = "memory", matchIfMissing = true)
public class InMemoryRoomSessionStore implements RoomSessionStore {

    private final ConcurrentMap<String, String> payloadByRoomCode = new ConcurrentHashMap<>();

    @Override
    public String read(String roomCode) {
        return payloadByRoomCode.get(roomCode);
    }

    @Override
    public void write(String roomCode, String payload) {
        payloadByRoomCode.put(roomCode, payload);
    }

    @Override
    public void delete(String roomCode) {
        payloadByRoomCode.remove(roomCode);
    }
}
