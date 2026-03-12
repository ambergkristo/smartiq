import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    bootstrapOnboardingTenant: vi.fn(),
    clearRuntimeAuthContext: vi.fn(),
    completeRuntimeAuth: vi.fn(),
    createRoomSession: vi.fn(),
    deleteRuntimeSessionReviewNote: vi.fn(),
    deleteRuntimeSessionTemplate: vi.fn(),
    duplicateServerGameSession: vi.fn(),
    fetchRoomPreview: vi.fn(),
    fetchTenantAuditEvents: vi.fn(),
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    fetchTenantRuntimeSnapshot: vi.fn(),
    fetchTenantUsageSummary: vi.fn(),
    hasRuntimeAuthContext: vi.fn(() => false),
    initiateCheckoutSession: vi.fn(),
    joinRoomSession: vi.fn(),
    logoutRuntimeAuth: vi.fn(),
    removeRoomPlayerFromSession: vi.fn(),
    rejoinRoomSession: vi.fn(),
    resumeServerGameSession: vi.fn(),
    requestRuntimeAuthLink: vi.fn(),
    resolveRoomSessionErrorMessage: vi.fn((error) => {
      if (error?.code === 'ROOM_NOT_FOUND' || error?.status === 404) {
        return 'Game code not found. Check the code and try again.';
      }
      if (error?.code === 'VALIDATION_ERROR' && /displayname/i.test(String(error?.message || ''))) {
        return 'Enter your display name.';
      }
      if (error?.code === 'VALIDATION_ERROR' && /roomcode/i.test(String(error?.message || ''))) {
        return 'Enter a valid game code.';
      }
      return 'Could not join this game. Retry in a moment.';
    }),
    setRuntimeAuthContext: vi.fn(),
    upsertRuntimeSessionReviewNote: vi.fn(),
    upsertRuntimeSessionTemplate: vi.fn(),
    updateRuntimeTenantBranding: vi.fn(),
    createServerGameSession: vi.fn(),
    fetchServerGameSession: vi.fn(),
    sendServerGameAction: vi.fn(),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveGameSessionErrorMessage: vi.fn(() => 'Could not process game action. Retry.'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Could not load topics.',
      detail: 'Unexpected backend response.',
      kind: 'backend-unreachable'
    }))
  };
});

import {
  createServerGameSession,
  fetchTopics,
  joinRoomSession,
  rejoinRoomSession,
  sendServerGameAction
} from './api';
import { PLAYER_PROFILE_STORAGE_KEY } from './state/playerProfile';

function makeServerSnapshot({
  gameId = 'game-1',
  roundNumber = 1,
  phase = 'QUESTION_ACTIVE',
  activePlayerIndex = 0,
  question = 'Server question',
  options = null,
  lastAction = 'Server action',
  players = [
    { playerId: 'p1', displayName: 'Alice' },
    { playerId: 'p2', displayName: 'Bob' }
  ],
  statuses = null,
  totalScores = null,
  roundScores = null,
  pegStateByIndex = {},
  correctAnswerIndexes = [0],
  winCondition = 30
} = {}) {
  const values = options || Array.from({ length: 8 }, (_, index) => `Option ${index + 1}`);
  const normalizedStatuses = statuses || Object.fromEntries(players.map((player) => [player.playerId, 'ACTIVE']));
  const normalizedTotalScores = totalScores || Object.fromEntries(players.map((player) => [player.playerId, 0]));
  const normalizedRoundScores = roundScores || Object.fromEntries(players.map((player) => [player.playerId, 0]));

  return {
    gameId,
    winCondition,
    activePlayerIndex,
    players,
    roundState: {
      roundNumber,
      phase,
      starterPlayerId: 'p1',
      currentPlayerId: players[activePlayerIndex]?.playerId || 'p1',
      lastAction
    },
    boardState: {
      question,
      category: 'OPEN',
      topic: 'History',
      correctAnswerIndexes,
      pegs: Array.from({ length: 8 }, (_, index) => ({
        index,
        state: pegStateByIndex[index] || 'hidden',
        value: values[index]
      }))
    },
    totalScores: normalizedTotalScores,
    roundScores: normalizedRoundScores,
    statuses: normalizedStatuses
  };
}

async function startServerMultiplayer(players = 'Alice, Bob') {
  const playersInput = await screen.findByLabelText(/players/i);
  const startButton = screen.getByRole('button', { name: /start game/i });
  fireEvent.change(playersInput, { target: { value: players } });
  fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(startButton).not.toBeDisabled());
  fireEvent.click(startButton);
  await waitFor(() => expect(createServerGameSession).toHaveBeenCalled());
}

async function startSoloMode() {
  const playButton = await screen.findByRole('button', { name: /play/i });
  fireEvent.click(playButton);
  await waitFor(() => expect(createServerGameSession).toHaveBeenCalled());
}

async function openJoinFlow({ roomCode = 'ABC123', displayName } = {}) {
  fireEvent.click(await screen.findByRole('button', { name: /join game/i }));
  fireEvent.change(await screen.findByLabelText(/game code/i), { target: { value: roomCode } });
  fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  const displayNameInput = await screen.findByLabelText(/your display name/i);
  if (typeof displayName === 'string') {
    fireEvent.change(displayNameInput, { target: { value: displayName } });
  }
  return displayNameInput;
}

describe('App server-authoritative mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_USE_SERVER_GAME_ENGINE', 'true');
    localStorage.clear();
    window.location.hash = '#/start';
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
  });

  afterEach(() => {
    window.location.hash = '';
    vi.unstubAllEnvs();
  });

  test('starts multiplayer rounds via server session API by default', async () => {
    createServerGameSession.mockResolvedValue(makeServerSnapshot());

    render(<App />);
    await startServerMultiplayer('Alice, Bob');

    await waitFor(() =>
      expect(createServerGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          players: ['Alice', 'Bob'],
          language: 'en',
          winCondition: 30
        })
      )
    );
    expect(screen.getByRole('button', { name: /^answer$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pass/i })).not.toBeInTheDocument();
  }, 15000);

  test('keeps the board fixed to 8 answers in server mode', async () => {
    createServerGameSession.mockResolvedValue(makeServerSnapshot());

    render(<App />);
    await startServerMultiplayer();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /^answer-\d/i })).toHaveLength(8));
  });

  test('shows the exact selected answer after backend resolves a fail snapshot', async () => {
    createServerGameSession.mockResolvedValue(makeServerSnapshot({ gameId: 'game-mismatch' }));
    sendServerGameAction.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-mismatch',
        phase: 'ROUND_FAIL',
        options: Array.from({ length: 8 }, (_, index) => `Different ${index + 1}`),
        pegStateByIndex: { 0: 'wrong' },
        lastAction: 'Alice ended the round with a wrong answer'
      })
    );

    render(<App />);
    await startServerMultiplayer();

    fireEvent.click(screen.getByRole('button', { name: /^answer-1\b/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^answer$/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /lock in/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));

    await waitFor(() => expect(sendServerGameAction).toHaveBeenCalledWith(
      'game-mismatch',
      expect.objectContaining({ type: 'ANSWER', tileIndex: 0 })
    ));
    expect(screen.getByTestId('correct-answer-display')).toHaveTextContent('Option 1');
    expect(screen.getByTestId('correct-answer-display')).not.toHaveTextContent('Different 1');
  });

  test('advances a successful round with an ADVANCE action', async () => {
    createServerGameSession.mockResolvedValue(makeServerSnapshot({ gameId: 'game-success' }));
    sendServerGameAction
      .mockResolvedValueOnce(
        makeServerSnapshot({
          gameId: 'game-success',
          phase: 'ROUND_SUCCESS',
          pegStateByIndex: { 0: 'revealed' },
          totalScores: { p1: 1, p2: 0 },
          roundScores: { p1: 1, p2: 0 },
          lastAction: 'Alice cleared the board'
        })
      )
      .mockResolvedValueOnce(
        makeServerSnapshot({
          gameId: 'game-success',
          roundNumber: 2,
          question: 'Round two question',
          lastAction: 'Round 2 started'
        })
      );

    render(<App />);
    await startServerMultiplayer();

    fireEvent.click(screen.getByRole('button', { name: /^answer-1\b/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^answer$/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /lock in/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));

    await waitFor(() => expect(sendServerGameAction).toHaveBeenNthCalledWith(
      2,
      'game-success',
      expect.objectContaining({ type: 'ADVANCE' })
    ));
    await waitFor(() => expect(screen.getByText(/round two question/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^answer$/i })).toBeInTheDocument();
  });

  test('starts solo mode from the home entry and applies Cherry XP on the 5th round', async () => {
    window.location.hash = '';
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-success',
      roundNumber: 5,
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [0]
    }));
    sendServerGameAction
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-success',
        roundNumber: 5,
        phase: 'ROUND_SUCCESS',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [0],
        pegStateByIndex: { 0: 'revealed' },
        lastAction: 'Solo Player cleared the board'
      }))
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-success',
        roundNumber: 6,
        question: 'Sixth solo question',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [2],
        lastAction: 'Round 6 started'
      }));

    render(<App />);
    await startSoloMode();

    await waitFor(() => expect(createServerGameSession).toHaveBeenCalledWith(
      expect.objectContaining({
        players: ['Solo Player'],
        language: 'en',
        winCondition: 1000000,
        mode: 'solo'
      })
    ));

    fireEvent.click(await screen.findByRole('button', { name: /^answer-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /lock in/i }));

    await waitFor(() => expect(screen.getByTestId('solo-round-result')).toHaveTextContent('SUCCESS'));
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('Cherry');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('XP x2');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('200');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('200');

    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    await waitFor(() => expect(screen.getByText(/sixth solo question/i)).toBeInTheDocument());
  });

  test('sets round XP to zero on failed Cherry rounds and reveals the correct answers', async () => {
    window.location.hash = '';
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-fail',
      roundNumber: 5,
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [1, 3]
    }));
    sendServerGameAction.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-fail',
      roundNumber: 5,
      phase: 'ROUND_FAIL',
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [1, 3],
      pegStateByIndex: { 0: 'wrong' },
      lastAction: 'Solo Player ended the round with a wrong answer'
    }));

    render(<App />);
    await startSoloMode();

    fireEvent.click(await screen.findByRole('button', { name: /^answer-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /lock in/i }));

    await waitFor(() => expect(screen.getByTestId('solo-round-result')).toHaveTextContent('FAIL'));
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('Cherry');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('XP x2');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('XP gained');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('0');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('Option 2, Option 4');
  });

  test('applies Double Cherry XP on the 10th round', async () => {
    window.location.hash = '';
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-double-cherry',
      roundNumber: 10,
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [0]
    }));
    sendServerGameAction.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-double-cherry',
      roundNumber: 10,
      phase: 'ROUND_SUCCESS',
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [0],
      pegStateByIndex: { 0: 'revealed' },
      lastAction: 'Solo Player cleared a double cherry round'
    }));

    render(<App />);
    await startSoloMode();

    fireEvent.click(await screen.findByRole('button', { name: /^answer-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /lock in/i }));

    await waitFor(() => expect(screen.getByTestId('solo-round-result')).toHaveTextContent('Double Cherry'));
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('XP x3');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('300');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('300');
  });

  test('accumulates solo XP across rounds and resets on a new run', async () => {
    window.location.hash = '';
    createServerGameSession
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-accumulate',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [0]
      }))
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-reset',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [4]
      }));
    sendServerGameAction
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-accumulate',
        phase: 'ROUND_SUCCESS',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [0],
        pegStateByIndex: { 0: 'revealed' },
        lastAction: 'Solo Player cleared the board'
      }))
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-accumulate',
        roundNumber: 2,
        question: 'Solo round two',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [1],
        lastAction: 'Round 2 started'
      }))
      .mockResolvedValueOnce(makeServerSnapshot({
        gameId: 'solo-accumulate',
        roundNumber: 2,
        phase: 'ROUND_SUCCESS',
        players: [{ playerId: 'p1', displayName: 'Solo Player' }],
        correctAnswerIndexes: [1],
        pegStateByIndex: { 1: 'revealed' },
        lastAction: 'Solo Player cleared the board again'
      }));

    render(<App />);
    await startSoloMode();

    fireEvent.click(await screen.findByRole('button', { name: /^answer-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /lock in/i }));
    await waitFor(() => expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('100'));

    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    await waitFor(() => expect(screen.getByText(/solo round two/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^answer-2\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /lock in/i }));
    await waitFor(() => expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('200'));

    fireEvent.click(screen.getByRole('button', { name: /back to setup/i }));
    await startSoloMode();
    await waitFor(() => expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('0'));
  });

  test('home shows Play, Join Game, Host Game, and the guest profile summary', async () => {
    window.location.hash = '';

    render(<App />);

    expect(await screen.findByTestId('home-screen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /host game/i })).toBeInTheDocument();
    expect(screen.getByTestId('home-screen-profile')).toHaveTextContent(/level 1/i);
    expect(screen.getByTestId('home-screen-profile')).toHaveTextContent(/0 xp saved locally on this browser/i);
  });

  test('renders the Join Game shell and navigates back home', async () => {
    window.location.hash = '';

    render(<App />);

    await openJoinFlow({ roomCode: 'JOIN42' });
    expect(await screen.findByTestId('home-join-panel')).toBeInTheDocument();
    expect(screen.getByText(/join a cherrypick game/i)).toBeInTheDocument();
    expect(screen.getByText('JOIN42')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(await screen.findByTestId('home-screen')).toBeInTheDocument();
  });

  test('reuses the guest name by default and joins into the waiting state', async () => {
    window.location.hash = '';
    localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify({
      id: 'profile_1',
      guestToken: 'guest_1',
      displayName: 'Kai',
      totalXp: 500,
      level: 2,
      gamesPlayed: 3,
      roundsWon: 2,
      createdAt: '2026-03-12T10:00:00.000Z',
      updatedAt: '2026-03-12T10:00:00.000Z'
    }));
    joinRoomSession.mockResolvedValue({
      roomCode: 'JOIN42',
      playerId: 'player-1',
      authToken: 'auth-1'
    });
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'JOIN42',
      playerId: 'player-1',
      authToken: 'auth-1',
      roomState: {
        players: [
          { playerId: 'player-1', displayName: 'Kai' },
          { playerId: 'player-2', displayName: 'Robin' }
        ]
      }
    });

    render(<App />);

    const displayNameInput = await openJoinFlow({ roomCode: 'JOIN42' });
    expect(displayNameInput).toHaveValue('Kai');

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => expect(joinRoomSession).toHaveBeenCalledWith('JOIN42', { displayName: 'Kai' }));
    await waitFor(() => expect(rejoinRoomSession).toHaveBeenCalledWith('JOIN42', {
      playerId: 'player-1',
      authToken: 'auth-1'
    }));
    expect(await screen.findByTestId('player-lobby-panel')).toBeInTheDocument();
    expect(screen.getByText('JOIN42')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Kai' })).toBeInTheDocument();
    expect(screen.getAllByText(/waiting for the host to launch or resume the live session/i).length).toBeGreaterThan(0);
  });

  test('shows a clean error when the game code is invalid', async () => {
    window.location.hash = '';
    joinRoomSession.mockRejectedValue({
      code: 'ROOM_NOT_FOUND',
      status: 404
    });

    render(<App />);

    await openJoinFlow({ roomCode: 'BAD999', displayName: 'Mia' });
    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    expect(await screen.findByTestId('player-route-error')).toHaveTextContent('Game code not found. Check the code and try again.');
  });

  test('renders the Host Game shell and navigates back home', async () => {
    window.location.hash = '';

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /host game/i }));
    expect(await screen.findByTestId('host-game-panel')).toBeInTheDocument();
    expect(screen.getByText(/host cherrypick/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /host mode coming next/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(await screen.findByTestId('home-screen')).toBeInTheDocument();
  });

  test('waiting state can navigate back home cleanly after a successful join', async () => {
    window.location.hash = '';
    joinRoomSession.mockResolvedValue({
      roomCode: 'WAIT77',
      playerId: 'player-7',
      authToken: 'auth-7'
    });
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'WAIT77',
      playerId: 'player-7',
      authToken: 'auth-7',
      roomState: {
        players: [{ playerId: 'player-7', displayName: 'Nora' }]
      }
    });

    render(<App />);

    await openJoinFlow({ roomCode: 'WAIT77', displayName: 'Nora' });
    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    expect(await screen.findByTestId('player-lobby-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(await screen.findByTestId('home-screen')).toBeInTheDocument();
  });

  test('creates a guest profile and persists solo totals across refresh', async () => {
    window.location.hash = '';
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-profile',
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [0]
    }));
    sendServerGameAction.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-profile',
      phase: 'ROUND_SUCCESS',
      players: [{ playerId: 'p1', displayName: 'Solo Player' }],
      correctAnswerIndexes: [0],
      pegStateByIndex: { 0: 'revealed' },
      lastAction: 'Solo Player cleared the board'
    }));

    const firstRender = render(<App />);
    expect(JSON.parse(localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY))).toMatchObject({
      displayName: 'Solo Player',
      totalXp: 0,
      level: 1
    });

    await startSoloMode();
    fireEvent.click(await screen.findByRole('button', { name: /^answer-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /^answer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /lock in/i }));

    await waitFor(() => expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('100'));
    await waitFor(() => expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('1'));
    firstRender.unmount();

    window.location.hash = '';
    render(<App />);
    await startSoloMode();

    await waitFor(() => expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('100'));
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('2');
  });

  test('reuses existing guest profile name for new solo sessions', async () => {
    window.location.hash = '';
    localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify({
      id: 'profile_1',
      guestToken: 'guest_1',
      displayName: 'Kai',
      totalXp: 500,
      level: 2,
      gamesPlayed: 3,
      roundsWon: 2,
      createdAt: '2026-03-12T10:00:00.000Z',
      updatedAt: '2026-03-12T10:00:00.000Z'
    }));
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'solo-name',
      players: [{ playerId: 'p1', displayName: 'Kai' }],
      correctAnswerIndexes: [0]
    }));

    render(<App />);
    await screen.findByTestId('home-screen-profile');
    expect(screen.getByTestId('home-screen-profile')).toHaveTextContent('Level 2');
    expect(screen.getByDisplayValue('Kai')).toBeInTheDocument();

    await startSoloMode();

    await waitFor(() => expect(createServerGameSession).toHaveBeenCalledWith(
      expect.objectContaining({
        players: ['Kai'],
        mode: 'solo'
      })
    ));
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('Kai');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('500');
  });
});
