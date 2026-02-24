package com.smartiq.backend.game;

import com.smartiq.backend.game.contract.GameSessionSnapshot;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game")
public class GameSessionController {

    private final GameSessionService gameSessionService;

    public GameSessionController(GameSessionService gameSessionService) {
        this.gameSessionService = gameSessionService;
    }

    @PostMapping
    public GameSessionCreateResponse createGame(@RequestBody(required = false) CreateGameRequest request) {
        return gameSessionService.createGameWithControl(request);
    }

    @GetMapping("/{gameId}")
    public GameSessionSnapshot getGame(@PathVariable String gameId) {
        return gameSessionService.getSnapshot(gameId);
    }

    @PostMapping("/{gameId}/action")
    public GameSessionSnapshot applyAction(@PathVariable String gameId,
                                           @RequestBody(required = false) GameActionRequest request) {
        return gameSessionService.applyAction(gameId, request);
    }
}
