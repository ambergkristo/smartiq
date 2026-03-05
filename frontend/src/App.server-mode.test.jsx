import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import gameSessionCreateResponseV1 from './fixtures/contracts/game-session-create-response-v1.json';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    fetchTenantRuntimeSnapshot: vi.fn(),
    hasRuntimeAuthContext: vi.fn(() => false),
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
  fetchNextCard,
  fetchTopics,
  resolveGameSessionErrorMessage,
  sendServerGameAction
} from './api';

function cloneFixture(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeServerSnapshot({
  gameId = 'game-1',
  winCondition = 30,
  roundNumber = 1,
  phase = 'CHOOSING',
  activePlayerIndex = 0,
  question = 'Server question',
  category = 'OPEN',
  lastAction = 'Server action',
  statuses = { p1: 'ACTIVE', p2: 'ACTIVE' },
  totalScores = { p1: 0, p2: 0 },
  roundScores = { p1: 0, p2: 0 },
  pegStateByIndex = {}
} = {}) {
  const players = [
    { playerId: 'p1', displayName: 'Alice' },
    { playerId: 'p2', displayName: 'Bob' }
  ];

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
      category,
      topic: 'History',
      pegs: Array.from({ length: 10 }, (_, index) => {
        const state = pegStateByIndex[index] || 'hidden';
        return {
          index,
          state,
          value: state === 'hidden' ? null : `Option ${index + 1}`
        };
      })
    },
    totalScores,
    roundScores,
    statuses
  };
}

async function startServerMultiplayer(players = 'Alice, Bob') {
  await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
  const playersInput = screen.getByLabelText(/players/i);
  fireEvent.change(playersInput, { target: { value: players } });
  fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: /start game/i }));
  await waitFor(() => expect(createServerGameSession).toHaveBeenCalled());
}

describe('App server-authoritative mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_USE_SERVER_GAME_ENGINE', 'true');
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('starts multiplayer rounds via server session API by default', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot());

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() =>
      expect(createServerGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          players: ['Alice', 'Bob'],
          language: 'en',
          winCondition: 30
        })
      )
    );
    expect(fetchNextCard).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument();
  });

  test('sends ANSWER action through server action API', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot({ gameId: 'game-1' }));
    sendServerGameAction.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-1',
        activePlayerIndex: 1,
        pegStateByIndex: { 0: 'revealed' }
      })
    );

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^peg-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));

    await waitFor(() =>
      expect(sendServerGameAction).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({
          type: 'ANSWER',
          tileIndex: 0
        })
      )
    );
  });

  test('uses server path for single-player start when server engine is enabled', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-single',
        totalScores: { p1: 0, p2: 0 },
        roundScores: { p1: 0, p2: 0 }
      })
    );

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => expect(createServerGameSession).toHaveBeenCalled());
    expect(fetchNextCard).not.toHaveBeenCalled();
  });

  test('keeps multiplayer on server path in non-test runtime even with false toggle', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_USE_SERVER_GAME_ENGINE', 'false');
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot({ gameId: 'game-prod' }));

    render(<App />);
    await startServerMultiplayer();

    expect(createServerGameSession).toHaveBeenCalled();
    expect(fetchNextCard).not.toHaveBeenCalled();
  });

  test('sends PASS action through server action API', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'game-pass',
      roundScores: { p1: 1, p2: 0 }
    }));
    sendServerGameAction.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-pass',
        activePlayerIndex: 1,
        statuses: { p1: 'PASSED', p2: 'ACTIVE' },
        lastAction: 'Alice passed'
      })
    );

    render(<App />);
    await startServerMultiplayer();

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    await waitFor(() =>
      expect(sendServerGameAction).toHaveBeenCalledWith(
        'game-pass',
        expect.objectContaining({ type: 'PASS' })
      )
    );

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument());
  });

  test('disables controls when active player is not local player', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-spectator',
        activePlayerIndex: 1,
        lastAction: 'Bob turn'
      })
    );

    render(<App />);
    await startServerMultiplayer();

    const passButton = screen.getByRole('button', { name: /pass/i });
    expect(passButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /^peg-1\b/i })).toBeDisabled();
    expect(screen.getByTestId('action-hint')).toHaveTextContent(/waiting for active player bob/i);

    fireEvent.click(passButton);
    expect(sendServerGameAction).not.toHaveBeenCalled();
  });

  test('keeps PASS disabled until active player has at least one correct answer', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'game-pass-locked',
      roundScores: { p1: 0, p2: 0 }
    }));

    render(<App />);
    await startServerMultiplayer();

    const passButton = screen.getByRole('button', { name: /pass/i });
    expect(passButton).toBeDisabled();
    expect(screen.getByTestId('action-hint')).toHaveTextContent(/before pass is available/i);

    fireEvent.click(passButton);
    expect(sendServerGameAction).not.toHaveBeenCalled();
  });

  test('shows round summary and then advances to next round from server snapshot', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'game-round',
      roundScores: { p1: 1, p2: 0 }
    }));
    sendServerGameAction.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-round',
        roundNumber: 2,
        question: 'Server round 2 question',
        activePlayerIndex: 1,
        totalScores: { p1: 1, p2: 0 },
        statuses: { p1: 'ACTIVE', p2: 'ACTIVE' },
        lastAction: 'Round 2 started'
      })
    );

    render(<App />);
    await startServerMultiplayer();

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /round summary/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));

    await waitFor(() => expect(screen.getByText(/server round 2 question/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument();
  });

  test('shows game summary when server snapshot reports game over', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(makeServerSnapshot({
      gameId: 'game-over',
      roundScores: { p1: 1, p2: 0 }
    }));
    sendServerGameAction.mockResolvedValue(
      makeServerSnapshot({
        gameId: 'game-over',
        phase: 'GAME_OVER',
        winCondition: 30,
        totalScores: { p1: 30, p2: 12 },
        statuses: { p1: 'ACTIVE', p2: 'OUT' },
        lastAction: 'Alice reached 30 points'
      })
    );

    render(<App />);
    await startServerMultiplayer();

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /game summary/i })).toBeInTheDocument());
    expect(screen.getByText(/alice reached 30 points\./i)).toBeInTheDocument();
  });

  test('accepts v1 create-session contract fixture', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    createServerGameSession.mockResolvedValue(cloneFixture(gameSessionCreateResponseV1));

    render(<App />);
    await startServerMultiplayer();

    await waitFor(() => expect(screen.getByText(/contract fixture question\?/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument();
  });

  test('shows contract mismatch error for unsupported snapshot version', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    resolveGameSessionErrorMessage.mockImplementationOnce((error) => error?.message || 'Contract mismatch');
    const response = cloneFixture(gameSessionCreateResponseV1);
    response.snapshot.apiVersion = '2';
    createServerGameSession.mockResolvedValue(response);

    render(<App />);
    await startServerMultiplayer();

    await waitFor(() => expect(screen.getByText(/unsupported game session api version: 2/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
