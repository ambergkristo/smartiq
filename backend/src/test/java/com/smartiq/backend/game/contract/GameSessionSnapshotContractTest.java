package com.smartiq.backend.game.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GameSessionSnapshotContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesStableContractShape() throws Exception {
        GameSessionSnapshot snapshot = new GameSessionSnapshot(
                "game-1",
                30,
                0,
                List.of(
                        new PlayerSnapshot("p1", "Player 1"),
                        new PlayerSnapshot("p2", "Player 2")
                ),
                new RoundStateSnapshot(1, "CHOOSING", "p1", "p1", "Round started"),
                new BoardStateSnapshot(
                        "Question text?",
                        "OPEN",
                        "Science",
                        List.of(
                                new PegSnapshot(0, "hidden", null),
                                new PegSnapshot(1, "selected", null)
                        )
                ),
                Map.of("p1", 0, "p2", 0),
                Map.of("p1", 0, "p2", 0),
                Map.of("p1", PlayerRoundStatus.ACTIVE, "p2", PlayerRoundStatus.PASSED)
        );

        JsonNode node = objectMapper.readTree(objectMapper.writeValueAsString(snapshot));

        assertThat(node.path("gameId").asText()).isEqualTo("game-1");
        assertThat(node.path("winCondition").asInt()).isEqualTo(30);
        assertThat(node.path("activePlayerIndex").asInt()).isEqualTo(0);
        assertThat(node.path("players")).hasSize(2);
        assertThat(node.path("players").get(0).path("playerId").asText()).isEqualTo("p1");
        assertThat(node.path("players").get(1).path("displayName").asText()).isEqualTo("Player 2");
        assertThat(node.path("roundState").path("phase").asText()).isEqualTo("CHOOSING");
        assertThat(node.path("boardState").path("question").asText()).isEqualTo("Question text?");
        assertThat(node.path("boardState").path("pegs").get(1).path("state").asText()).isEqualTo("selected");
        assertThat(node.at("/statuses/p1").asText()).isEqualTo("ACTIVE");
        assertThat(node.at("/statuses/p2").asText()).isEqualTo("PASSED");
    }
}
