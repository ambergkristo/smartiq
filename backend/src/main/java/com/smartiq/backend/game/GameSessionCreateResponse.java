package com.smartiq.backend.game;

import com.smartiq.backend.game.contract.GameSessionSnapshot;

import java.util.Map;

public record GameSessionCreateResponse(
        GameSessionSnapshot snapshot,
        Map<String, String> actionTokens
) {
}
