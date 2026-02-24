package com.smartiq.backend.room;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public RoomParticipantResponse createRoom(@RequestBody(required = false) CreateRoomRequest request) {
        return roomService.createRoom(request);
    }

    @PostMapping("/{roomCode}/join")
    public RoomParticipantResponse joinRoom(@PathVariable String roomCode,
                                            @RequestBody(required = false) JoinRoomRequest request) {
        return roomService.joinRoom(roomCode, request);
    }
}
