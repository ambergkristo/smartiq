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
  const soloButton = await screen.findByRole('button', { name: /play solo/i });
  fireEvent.click(soloButton);
  await waitFor(() => expect(createServerGameSession).toHaveBeenCalled());
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
