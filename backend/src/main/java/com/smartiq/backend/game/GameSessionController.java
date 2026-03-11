package com.smartiq.backend.game;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.room.RoomActiveGameSnapshot;
import com.smartiq.backend.room.RoomActiveGamePegSnapshot;
import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.RoomSnapshot;
import com.smartiq.backend.room.ws.RoomWsGateway;
import com.smartiq.backend.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameSessionController {

    private final GameSessionService gameSessionService;
    private final AuthContextResolver authContextResolver;
    private final TenantService tenantService;
    private final RoomService roomService;
    private final RoomWsGateway roomWsGateway;

    public GameSessionController(GameSessionService gameSessionService,
                                 AuthContextResolver authContextResolver,
                                 TenantService tenantService,
                                 RoomService roomService,
                                 RoomWsGateway roomWsGateway) {
        this.gameSessionService = gameSessionService;
        this.authContextResolver = authContextResolver;
        this.tenantService = tenantService;
        this.roomService = roomService;
        this.roomWsGateway = roomWsGateway;
    }

    @PostMapping
    public GameSessionCreateResponse createGame(@RequestBody(required = false) CreateGameRequest request,
                                                HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        assertRoomAccessible(request, context);
        if (context != null && context.tenantId() != null) {
            tenantService.assertHostedGameSessionCreationAllowedForMember(
                    context.userEmail(),
                    context.tenantId(),
                    request == null ? null : request.players()
            );
        }
        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                request,
                context == null ? null : context.tenantId(),
                context == null ? null : context.userEmail()
        );
        publishRoomSnapshot(created.snapshot(), context);
        if (context != null && context.tenantId() != null) {
            int playerCount = request == null || request.players() == null ? 0 : request.players().size();
            tenantService.recordHostGameSessionCreated(
                    context.userEmail(),
                    context.tenantId(),
                    created.snapshot().gameId(),
                    playerCount,
                    request == null ? null : request.language(),
                    request == null ? null : request.topic()
            );
        }
        return created;
    }

    @GetMapping("/{gameId}")
    public GameSessionSnapshot getGame(@PathVariable String gameId,
                                       HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        return gameSessionService.getSnapshot(gameId, context == null ? null : context.tenantId());
    }

    @PostMapping("/{gameId}/duplicate")
    public GameSessionCreateResponse duplicateGame(@PathVariable String gameId,
                                                   HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        CreateGameRequest duplicateRequest = gameSessionService.buildDuplicateRequest(
                gameId,
                context == null ? null : context.tenantId()
        );
        if (context != null && context.tenantId() != null) {
            tenantService.assertHostedGameSessionCreationAllowedForMember(
                    context.userEmail(),
                    context.tenantId(),
                    duplicateRequest.players()
            );
        }
        GameSessionCreateResponse duplicated = gameSessionService.duplicateGameWithControl(
                gameId,
                context == null ? null : context.tenantId(),
                context == null ? null : context.userEmail()
        );
        if (context != null && context.tenantId() != null) {
            int playerCount = duplicateRequest.players() == null ? 0 : duplicateRequest.players().size();
            tenantService.recordHostGameSessionCreated(
                    context.userEmail(),
                    context.tenantId(),
                    duplicated.snapshot().gameId(),
                    playerCount,
                    duplicateRequest.language(),
                    duplicateRequest.topic()
            );
            tenantService.recordHostGameSessionDuplicated(
                    context.userEmail(),
                    context.tenantId(),
                    gameId,
                    duplicated.snapshot().gameId()
            );
        }
        return duplicated;
    }

    @PostMapping("/{gameId}/resume")
    public GameSessionCreateResponse resumeGame(@PathVariable String gameId,
                                                HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        if (context == null || context.tenantId() == null) {
            throw new IllegalArgumentException("tenant context is required");
        }
        tenantService.assertHostedRuntimeAllowedForMember(context.userEmail(), context.tenantId());
        GameSessionCreateResponse response = gameSessionService.getGameWithControl(gameId, context.tenantId());
        publishRoomSnapshot(response.snapshot(), context);
        tenantService.recordHostGameSessionResumed(context.userEmail(), context.tenantId(), gameId);
        return response;
    }

    @PostMapping("/{gameId}/action")
    public GameSessionSnapshot applyAction(@PathVariable String gameId,
                                           @RequestBody(required = false) GameActionRequest request,
                                           HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        GameSessionSnapshot snapshot = gameSessionService.applyAction(gameId, request, context == null ? null : context.tenantId());
        publishRoomSnapshot(snapshot, context);
        if (context != null
                && context.tenantId() != null
                && "GAME_OVER".equalsIgnoreCase(snapshot.roundState().phase())) {
            PlayerSnapshot winningPlayer = snapshot.players().stream()
                    .max(Comparator.comparingInt(player -> snapshot.totalScores().getOrDefault(player.playerId(), 0)))
                    .orElse(null);
            tenantService.recordHostGameSessionCompleted(
                    context.userEmail(),
                    context.tenantId(),
                    snapshot.gameId(),
                    winningPlayer == null ? null : winningPlayer.displayName(),
                    winningPlayer == null ? null : snapshot.totalScores().getOrDefault(winningPlayer.playerId(), 0),
                    snapshot.roundState().roundNumber(),
                    snapshot.boardState() == null ? null : snapshot.boardState().topic()
            );
        }
        return snapshot;
    }

    private void assertRoomAccessible(CreateGameRequest request, ResolvedAuthContext context) {
        String roomCode = request == null ? null : request.roomCode();
        if (roomCode == null || roomCode.isBlank()) {
            return;
        }
        roomService.getRoomSnapshot(roomCode, context == null ? null : context.tenantId());
    }

    private void publishRoomSnapshot(GameSessionSnapshot snapshot, ResolvedAuthContext context) {
        String roomCode = snapshot == null ? null : snapshot.roomCode();
        if (roomCode == null || roomCode.isBlank()) {
            return;
        }
        try {
            RoomSnapshot roomSnapshot = roomService.upsertActiveGame(
                    roomCode,
                    toRoomActiveGame(snapshot),
                    context == null ? null : context.tenantId()
            );
            roomWsGateway.sendRoomState(roomCode, roomSnapshot);
        } catch (java.util.NoSuchElementException ignored) {
            // Keep the game authoritative even if the room context has already expired.
        }
    }

    private static RoomActiveGameSnapshot toRoomActiveGame(GameSessionSnapshot snapshot) {
        String currentPlayerId = snapshot.roundState() == null ? null : snapshot.roundState().currentPlayerId();
        String currentPlayerDisplayName = snapshot.players().stream()
                .filter(player -> player.playerId().equals(currentPlayerId))
                .map(PlayerSnapshot::displayName)
                .findFirst()
                .orElse(currentPlayerId);
        Map<String, String> playerDisplayNames = snapshot.players().stream()
                .collect(java.util.stream.Collectors.toMap(
                        PlayerSnapshot::playerId,
                        PlayerSnapshot::displayName,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ));
        java.util.List<RoomActiveGamePegSnapshot> pegs = snapshot.boardState() == null
                ? java.util.List.of()
                : snapshot.boardState().pegs().stream()
                .map(peg -> new RoomActiveGamePegSnapshot(peg.index(), peg.state(), peg.value()))
                .toList();
        return new RoomActiveGameSnapshot(
                snapshot.gameId(),
                snapshot.roomCode(),
                snapshot.winCondition(),
                snapshot.roundState() == null ? 0 : snapshot.roundState().roundNumber(),
                snapshot.roundState() == null ? "" : snapshot.roundState().phase(),
                snapshot.boardState() == null ? "" : snapshot.boardState().topic(),
                snapshot.boardState() == null ? "" : snapshot.boardState().question(),
                snapshot.roundState() == null ? "" : snapshot.roundState().lastAction(),
                snapshot.roundState() == null ? "" : snapshot.roundState().starterPlayerId(),
                currentPlayerId,
                currentPlayerDisplayName,
                playerDisplayNames,
                pegs,
                snapshot.totalScores(),
                snapshot.roundScores(),
                snapshot.statuses()
        );
    }
}
