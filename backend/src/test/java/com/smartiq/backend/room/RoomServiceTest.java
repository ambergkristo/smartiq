package com.smartiq.backend.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.RoomProperties;
import com.smartiq.backend.game.GameSessionCreateResponse;
import com.smartiq.backend.game.contract.BoardStateSnapshot;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PegSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.game.contract.RoundStateSnapshot;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoomServiceTest {

    private SimpleMeterRegistry meterRegistry;
    private RoomService roomService;
    private MutableClock testClock;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        testClock = new MutableClock(Instant.parse("2026-02-25T00:00:00Z"), ZoneOffset.UTC);
        roomService = new RoomService(
                meterRegistry,
                new RoomProperties(180, 20000),
                testClock
        );
    }

    @Test
    void createRoomAllocatesHostPlayerAndToken() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThat(created.roomCode()).matches("^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$");
        assertThat(created.playerId()).isEqualTo("p1");
        assertThat(created.authToken()).startsWith("rt_");
    }

    @Test
    void joinRoomAllocatesNextPlayerId() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        RoomParticipantResponse joined = roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        assertThat(joined.roomCode()).isEqualTo(created.roomCode());
        assertThat(joined.playerId()).isEqualTo("p2");
        assertThat(joined.authToken()).startsWith("rt_");
        assertThat(joined.authToken()).isNotEqualTo(created.authToken());
    }

    @Test
    void roomSnapshotContainsAllPlayersInJoinOrder() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        RoomSnapshot snapshot = roomService.getRoomSnapshot(created.roomCode());

        assertThat(snapshot.roomCode()).isEqualTo(created.roomCode());
        assertThat(snapshot.tenantId()).isNull();
        assertThat(snapshot.branding()).isNull();
        assertThat(snapshot.players()).hasSize(2);
        assertThat(snapshot.players().get(0).playerId()).isEqualTo("p1");
        assertThat(snapshot.players().get(0).displayName()).isEqualTo("Alice");
        assertThat(snapshot.players().get(1).playerId()).isEqualTo("p2");
        assertThat(snapshot.players().get(1).displayName()).isEqualTo("Bob");
    }

    @Test
    void rejoinWithValidTokenReturnsLatestRoomSnapshot() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        RoomResumeResponse resumed = roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        );

        assertThat(resumed.roomCode()).isEqualTo(created.roomCode());
        assertThat(resumed.playerId()).isEqualTo("p1");
        assertThat(resumed.authToken()).startsWith("rt_");
        assertThat(resumed.authToken()).isNotEqualTo(created.authToken());
        assertThat(resumed.roomState().players()).hasSize(2);
    }

    @Test
    void rejoinInvalidatesPreviousToken() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        RoomResumeResponse firstResume = roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        );

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("invalid room token");

        RoomResumeResponse secondResume = roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), firstResume.authToken())
        );
        assertThat(secondResume.authToken()).isNotEqualTo(firstResume.authToken());
    }

    @Test
    void websocketResumeDoesNotRotateToken() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        RoomResumeResponse resumed = roomService.resumeRoomSession(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        );

        assertThat(resumed.authToken()).isEqualTo(created.authToken());
    }

    @Test
    void reconnectHandshakeRotatesViaHttpAndPreservesTokenViaWebsocketResume() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        RoomResumeResponse httpResume = roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        );

        assertThat(httpResume.authToken()).isNotEqualTo(created.authToken());
        assertThatThrownBy(() -> roomService.resumeRoomSession(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("invalid room token");

        RoomResumeResponse websocketResume = roomService.resumeRoomSession(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), httpResume.authToken())
        );

        assertThat(websocketResume.authToken()).isEqualTo(httpResume.authToken());
        assertThat(websocketResume.roomState().players())
                .extracting(RoomPlayerSnapshot::displayName)
                .containsExactly("Alice", "Bob");
    }

    @Test
    void hostCanRemoveNonHostPlayerFromRoom() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        RoomParticipantResponse joined = roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        RoomSnapshot snapshot = roomService.removePlayer(
                created.roomCode(),
                new RemoveRoomPlayerRequest(created.playerId(), created.authToken(), joined.playerId()),
                null
        );

        assertThat(snapshot.players()).extracting(RoomPlayerSnapshot::displayName).containsExactly("Alice");
        assertThat(counterValue("smartiq.room.remove.total", "result", "success")).isEqualTo(1.0);
    }

    @Test
    void removingPlayerDoesNotReuseExistingPlayerId() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        RoomParticipantResponse joined = roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Cara"));
        roomService.removePlayer(
                created.roomCode(),
                new RemoveRoomPlayerRequest(created.playerId(), created.authToken(), joined.playerId()),
                null
        );

        RoomParticipantResponse rejoined = roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Dana"));

        assertThat(rejoined.playerId()).isEqualTo("p4");
    }

    @Test
    void nonHostCannotRemoveRoomPlayers() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        RoomParticipantResponse joined = roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        assertThatThrownBy(() -> roomService.removePlayer(
                created.roomCode(),
                new RemoveRoomPlayerRequest(joined.playerId(), joined.authToken(), created.playerId()),
                null
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("only host can remove room players");

        assertThat(counterValue("smartiq.room.remove.total", "result", "failure", "reason", "forbidden_actor"))
                .isEqualTo(1.0);
    }

    @Test
    void rejoinRejectsInvalidToken() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), "rt_invalid")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("invalid room token");
    }

    @Test
    void rejoinRejectsInvalidPlayerIdFormat() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest("player-1", created.authToken())
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("playerId format is invalid");
    }

    @Test
    void rejoinRejectsOverflowPlayerIdFormat() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest("p99999999999999999999", created.authToken())
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("playerId format is invalid");
    }

    @Test
    void joinUnknownRoomThrowsNotFound() {
        assertThatThrownBy(() -> roomService.joinRoom("ZZZZZZ", new JoinRoomRequest("Bob")))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("room not found: ZZZZZZ");
    }

    @Test
    void joinRoomRejectsInvalidRoomCodeFormat() {
        assertThatThrownBy(() -> roomService.joinRoom("MISSING", new JoinRoomRequest("Bob")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("room code format is invalid");
    }

    @Test
    void createRoomRejectsOversizedDisplayName() {
        assertThatThrownBy(() -> roomService.createRoom(new CreateRoomRequest("A".repeat(65))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("displayName is too long");
    }

    @Test
    void createRoomRejectsDisplayNameWithControlCharacters() {
        assertThatThrownBy(() -> roomService.createRoom(new CreateRoomRequest("Alice\nBob")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("displayName contains control characters");
    }

    @Test
    void joinRoomRejectsWhenRoomIsFull() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        for (int playerNumber = 2; playerNumber <= 8; playerNumber += 1) {
            roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Player " + playerNumber));
        }

        assertThatThrownBy(() -> roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Overflow")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("room is full");
    }

    @Test
    void launchRoomMarksRoomLiveAndBlocksLaterJoin() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Host"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Alice"));

        RoomLaunchResult launched = roomService.launchRoom(
                created.roomCode(),
                new LaunchRoomGameRequest(created.playerId(), created.authToken(), List.of("Host", "Alice")),
                null,
                players -> createLaunchResponse("game-live", players)
        );

        assertThat(launched.roomState().phase()).isEqualTo(RoomPhase.LIVE);
        assertThat(launched.roomState().joinable()).isFalse();
        assertThat(launched.roomState().activeGame()).isNotNull();
        assertThat(launched.roomState().activeGame().gameId()).isEqualTo("game-live");

        assertThatThrownBy(() -> roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob")))
                .isInstanceOf(RoomClosedException.class)
                .hasMessage("room is no longer open for joining");
    }

    @Test
    void recordsJoinAndRejoinSuccessAndFailureMetrics() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));
        roomService.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        assertThatThrownBy(() -> roomService.joinRoom("ZZZZZZ", new JoinRoomRequest("Bob")))
                .isInstanceOf(NoSuchElementException.class);

        roomService.rejoinRoom(created.roomCode(), new RejoinRoomRequest(created.playerId(), created.authToken()));

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), "rt_invalid")
        )).isInstanceOf(IllegalArgumentException.class);

        assertThat(counterValue("smartiq.room.create.total", "result", "success")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.room.join.total", "result", "success")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.room.join.total", "result", "failure")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.room.rejoin.total", "result", "success")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.room.rejoin.total", "result", "failure")).isEqualTo(1.0);
    }

    @Test
    void recordsInvalidPlayerIdReasonForRejoinFailureMetric() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest("player-1", created.authToken())
        )).isInstanceOf(IllegalArgumentException.class);

        assertThat(counterValue("smartiq.room.rejoin.total", "result", "failure", "reason", "invalid_player_id"))
                .isEqualTo(1.0);
    }

    @Test
    void recordsOversizedPlayerIdAsInvalidPlayerIdReasonForRejoinFailureMetric() {
        RoomParticipantResponse created = roomService.createRoom(new CreateRoomRequest("Alice"));

        assertThatThrownBy(() -> roomService.rejoinRoom(
                created.roomCode(),
                new RejoinRoomRequest("p" + "1".repeat(64), created.authToken())
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("playerId is too long");

        assertThat(counterValue("smartiq.room.rejoin.total", "result", "failure", "reason", "invalid_player_id"))
                .isEqualTo(1.0);
    }

    @Test
    void evictsExpiredRoomsOnAccess() {
        RoomService ttlService = new RoomService(
                meterRegistry,
                new RoomProperties(1, 20000),
                testClock
        );
        RoomParticipantResponse created = ttlService.createRoom(new CreateRoomRequest("Alice"));

        testClock.advanceSeconds(61);

        assertThatThrownBy(() -> ttlService.getRoomSnapshot(created.roomCode()))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("room not found: " + created.roomCode());
        assertThat(evictedCounterValue("expired")).isEqualTo(1.0);
    }

    @Test
    void evictsOldestRoomWhenCapacityReached() {
        RoomService capService = new RoomService(
                meterRegistry,
                new RoomProperties(180, 1),
                testClock
        );
        RoomParticipantResponse first = capService.createRoom(new CreateRoomRequest("Alice"));
        testClock.advanceSeconds(1);
        RoomParticipantResponse second = capService.createRoom(new CreateRoomRequest("Bob"));

        assertThatThrownBy(() -> capService.getRoomSnapshot(first.roomCode()))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("room not found: " + first.roomCode());
        assertThat(capService.getRoomSnapshot(second.roomCode()).roomCode()).isEqualTo(second.roomCode());
        assertThat(evictedCounterValue("capacity")).isEqualTo(1.0);
    }

    @Test
    void restoresRoomFromStoreAfterServiceRestart() {
        InMemoryRoomSessionStore store = new InMemoryRoomSessionStore();
        ObjectMapper objectMapper = new ObjectMapper();
        RoomService firstInstance = new RoomService(
                meterRegistry,
                new RoomProperties(180, 20000),
                store,
                objectMapper,
                testClock
        );
        RoomParticipantResponse created = firstInstance.createRoom(new CreateRoomRequest("Alice"));
        firstInstance.joinRoom(created.roomCode(), new JoinRoomRequest("Bob"));

        RoomService restartedInstance = new RoomService(
                meterRegistry,
                new RoomProperties(180, 20000),
                store,
                objectMapper,
                testClock
        );

        RoomSnapshot restored = restartedInstance.getRoomSnapshot(created.roomCode());
        assertThat(restored.players()).hasSize(2);
        assertThat(restored.players().get(0).displayName()).isEqualTo("Alice");
        assertThat(restored.players().get(1).displayName()).isEqualTo("Bob");

        RoomResumeResponse resumed = restartedInstance.resumeRoomSession(
                created.roomCode(),
                new RejoinRoomRequest(created.playerId(), created.authToken())
        );
        assertThat(resumed.authToken()).isEqualTo(created.authToken());
    }

    @Test
    void restoresLaunchedRoomFromStoreAfterServiceRestart() {
        InMemoryRoomSessionStore store = new InMemoryRoomSessionStore();
        ObjectMapper objectMapper = new ObjectMapper();
        RoomService firstInstance = new RoomService(
                meterRegistry,
                new RoomProperties(180, 20000),
                store,
                objectMapper,
                testClock
        );
        RoomParticipantResponse created = firstInstance.createRoom(new CreateRoomRequest("Host"));
        firstInstance.joinRoom(created.roomCode(), new JoinRoomRequest("Alice"));
        firstInstance.launchRoom(
                created.roomCode(),
                new LaunchRoomGameRequest(created.playerId(), created.authToken(), List.of("Host", "Alice")),
                null,
                players -> createLaunchResponse("game-persisted", players)
        );

        RoomService restartedInstance = new RoomService(
                meterRegistry,
                new RoomProperties(180, 20000),
                store,
                objectMapper,
                testClock
        );

        RoomSnapshot restored = restartedInstance.getRoomSnapshot(created.roomCode());
        assertThat(restored.phase()).isEqualTo(RoomPhase.LIVE);
        assertThat(restored.joinable()).isFalse();
        assertThat(restored.activeGame()).isNotNull();
        assertThat(restored.activeGame().gameId()).isEqualTo("game-persisted");
    }

    private static GameSessionCreateResponse createLaunchResponse(String gameId, List<String> players) {
        List<PlayerSnapshot> playerSnapshots = java.util.stream.IntStream.range(0, players.size())
                .mapToObj(index -> new PlayerSnapshot("p" + (index + 1), players.get(index)))
                .toList();
        java.util.Map<String, Integer> totals = playerSnapshots.stream()
                .collect(java.util.stream.Collectors.toMap(
                        PlayerSnapshot::playerId,
                        player -> 0,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ));
        java.util.Map<String, PlayerRoundStatus> statuses = playerSnapshots.stream()
                .collect(java.util.stream.Collectors.toMap(
                        PlayerSnapshot::playerId,
                        player -> PlayerRoundStatus.ACTIVE,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ));
        return new GameSessionCreateResponse(
                new GameSessionSnapshot(
                        GameSessionSnapshot.CURRENT_API_VERSION,
                        gameId,
                        30,
                        0,
                        playerSnapshots,
                        new RoundStateSnapshot(1, "QUESTION_ACTIVE", "p1", "p1", "Game started"),
                        new BoardStateSnapshot(
                                "Question",
                                "OPEN",
                                "History",
                                List.of(
                                        new PegSnapshot(0, "hidden", "A"),
                                        new PegSnapshot(1, "hidden", "B")
                                ),
                                List.of(0)
                        ),
                        totals,
                        totals,
                        statuses
                ),
                java.util.Map.of("p1", "at_1")
        );
    }

    private double counterValue(String name, String... tags) {
        var counter = meterRegistry.find(name).tags(tags).counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }

    private double evictedCounterValue(String reason) {
        var counter = meterRegistry.find("smartiq.room.evicted.total").tag("reason", reason).counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;
        private final ZoneId zone;

        private MutableClock(Instant instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(instant, zone);
        }

        @Override
        public Instant instant() {
            return instant;
        }

        private void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }
    }
}
