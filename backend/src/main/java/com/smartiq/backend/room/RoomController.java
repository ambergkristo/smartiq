package com.smartiq.backend.room;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import com.smartiq.backend.tenant.TenantBrandingRuntimeResponse;
import com.smartiq.backend.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import com.smartiq.backend.room.ws.RoomWsGateway;
import org.springframework.web.bind.annotation.GetMapping;
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
    private final AuthContextResolver authContextResolver;
    private final TenantService tenantService;

    public RoomController(RoomService roomService,
                          RoomWsGateway roomWsGateway,
                          AuthContextResolver authContextResolver,
                          TenantService tenantService) {
        this.roomService = roomService;
        this.roomWsGateway = roomWsGateway;
        this.authContextResolver = authContextResolver;
        this.tenantService = tenantService;
    }

    @GetMapping("/{roomCode}")
    public RoomSnapshot getRoom(@PathVariable String roomCode,
                                HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        return decorateRoomSnapshot(roomService.getRoomSnapshot(
                roomCode,
                context == null ? null : context.tenantId()
        ));
    }

    @PostMapping
    public RoomParticipantResponse createRoom(@RequestBody(required = false) CreateRoomRequest request,
                                              HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        if (context != null && context.tenantId() != null) {
            tenantService.getMe(context.userEmail(), context.tenantId());
            tenantService.assertHostedRuntimeAllowedForMember(context.userEmail(), context.tenantId());
        }
        RoomParticipantResponse created = roomService.createRoom(
                request,
                context == null ? null : context.tenantId(),
                context == null ? null : context.userEmail()
        );
        if (context != null && context.tenantId() != null) {
            tenantService.recordHostRoomCreated(context.userEmail(), context.tenantId(), created.roomCode());
        }
        return created;
    }

    @PostMapping("/{roomCode}/join")
    public RoomParticipantResponse joinRoom(@PathVariable String roomCode,
                                            @RequestBody(required = false) JoinRoomRequest request,
                                            HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        RoomParticipantResponse participant = roomService.joinRoom(
                roomCode,
                request,
                context == null ? null : context.tenantId()
        );
        RoomSnapshot snapshot = decorateRoomSnapshot(roomService.getRoomSnapshot(
                participant.roomCode(),
                context == null ? null : context.tenantId()
        ));
        roomWsGateway.sendPlayerJoined(participant.roomCode(), participant.playerId(), snapshot);
        roomWsGateway.sendRoomState(participant.roomCode(), snapshot);
        return participant;
    }

    @PostMapping("/{roomCode}/rejoin")
    public RoomResumeResponse rejoinRoom(@PathVariable String roomCode,
                                         @RequestBody(required = false) RejoinRoomRequest request,
                                         HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        RoomResumeResponse resumed = roomService.rejoinRoom(roomCode, request, context == null ? null : context.tenantId());
        return new RoomResumeResponse(
                resumed.roomCode(),
                resumed.playerId(),
                resumed.authToken(),
                decorateRoomSnapshot(resumed.roomState())
        );
    }

    @PostMapping("/{roomCode}/remove-player")
    public RoomSnapshot removePlayer(@PathVariable String roomCode,
                                     @RequestBody(required = false) RemoveRoomPlayerRequest request,
                                     HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        RoomSnapshot snapshot = roomService.removePlayer(roomCode, request, context == null ? null : context.tenantId());
        RoomSnapshot decoratedSnapshot = decorateRoomSnapshot(snapshot);
        roomWsGateway.sendRoomState(roomCode, decoratedSnapshot);
        return decoratedSnapshot;
    }

    private RoomSnapshot decorateRoomSnapshot(RoomSnapshot snapshot) {
        if (snapshot == null || snapshot.tenantId() == null) {
            return snapshot;
        }
        TenantBrandingRuntimeResponse branding = tenantService.getTenantBrandingForRuntimeTenant(snapshot.tenantId());
        return new RoomSnapshot(
                snapshot.roomCode(),
                snapshot.tenantId(),
                new RoomBrandingSnapshot(
                        branding.branding().appName(),
                        branding.branding().logoUrl(),
                        branding.branding().primaryColor(),
                        branding.branding().secondaryColor()
                ),
                snapshot.players(),
                snapshot.phase(),
                snapshot.joinable(),
                snapshot.activeGame()
        );
    }
}
