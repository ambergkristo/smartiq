package com.smartiq.backend.game;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;

@RestController
@RequestMapping("/api/game")
public class GameSessionController {

    private final GameSessionService gameSessionService;
    private final AuthContextResolver authContextResolver;
    private final TenantService tenantService;

    public GameSessionController(GameSessionService gameSessionService,
                                 AuthContextResolver authContextResolver,
                                 TenantService tenantService) {
        this.gameSessionService = gameSessionService;
        this.authContextResolver = authContextResolver;
        this.tenantService = tenantService;
    }

    @PostMapping
    public GameSessionCreateResponse createGame(@RequestBody(required = false) CreateGameRequest request,
                                                HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
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
        tenantService.recordHostGameSessionResumed(context.userEmail(), context.tenantId(), gameId);
        return response;
    }

    @PostMapping("/{gameId}/action")
    public GameSessionSnapshot applyAction(@PathVariable String gameId,
                                           @RequestBody(required = false) GameActionRequest request,
                                           HttpServletRequest httpServletRequest) {
        ResolvedAuthContext context = authContextResolver.resolveOptional(httpServletRequest);
        GameSessionSnapshot snapshot = gameSessionService.applyAction(gameId, request, context == null ? null : context.tenantId());
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
}
