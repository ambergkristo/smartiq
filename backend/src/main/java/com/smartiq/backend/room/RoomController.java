package com.smartiq.backend.room;

import com.smartiq.backend.room.ws.RoomWsGateway;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final RoomWsGateway roomWsGateway;

    public RoomController(RoomService roomService, RoomWsGateway roomWsGateway) {
        this.roomService = roomService;
        this.roomWsGateway = roomWsGateway;
    }

    @PostMapping
    public RoomParticipantResponse createRoom(@RequestBody(required = false) CreateRoomRequest request) {
        return roomService.createRoom(request);
    }

    @PostMapping("/{roomCode}/join")
    public RoomParticipantResponse joinRoom(@PathVariable String roomCode,
                                            @RequestBody(required = false) JoinRoomRequest request) {
        RoomParticipantResponse participant = roomService.joinRoom(roomCode, request);
        RoomSnapshot snapshot = roomService.getRoomSnapshot(participant.roomCode());
        roomWsGateway.sendPlayerJoined(participant.roomCode(), participant.playerId(), snapshot);
        roomWsGateway.sendRoomState(participant.roomCode(), snapshot);
        return participant;
    }

    @PostMapping("/{roomCode}/rejoin")
    public RoomResumeResponse rejoinRoom(@PathVariable String roomCode,
                                         @RequestBody(required = false) RejoinRoomRequest request) {
        return roomService.rejoinRoom(roomCode, request);
    }
}
