import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => ({
  API_BASE: 'http://localhost:8080',
  bootstrapOnboardingTenant: vi.fn(),
  clearRuntimeAuthContext: vi.fn(),
  completeRuntimeAuth: vi.fn(),
  createRoomSession: vi.fn(),
  duplicateServerGameSession: vi.fn(),
  fetchRoomPreview: vi.fn(),
  fetchTenantAuditEvents: vi.fn(),
  fetchTopics: vi.fn(),
  fetchNextCard: vi.fn(),
  fetchServerGameSession: vi.fn(),
  resumeServerGameSession: vi.fn(),
  fetchTenantRuntimeSnapshot: vi.fn(),
  fetchTenantUsageSummary: vi.fn(),
  hasRuntimeAuthContext: vi.fn(),
  initiateCheckoutSession: vi.fn(),
  joinRoomSession: vi.fn(),
  logoutRuntimeAuth: vi.fn(),
  rejoinRoomSession: vi.fn(),
  requestRuntimeAuthLink: vi.fn(),
  setRuntimeAuthContext: vi.fn(),
  resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
  resolveTopicsErrorState: vi.fn(() => ({
    title: 'Could not load topics.',
    detail: 'Unexpected backend response.',
    kind: 'backend-unreachable'
  }))
}));

import {
  duplicateServerGameSession,
  fetchTenantAuditEvents,
  fetchServerGameSession,
  fetchTenantRuntimeSnapshot,
  fetchTenantUsageSummary,
  fetchTopics,
  hasRuntimeAuthContext,
  resumeServerGameSession
} from './api';

describe('App tenant runtime integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent2');
    document.title = 'SmartIQ';
    fetchTenantAuditEvents.mockResolvedValue([]);
    fetchTenantUsageSummary.mockResolvedValue([]);
    duplicateServerGameSession.mockResolvedValue({
      snapshot: {
        apiVersion: '1',
        gameId: 'game-duplicate',
        winCondition: 30,
        activePlayerIndex: 0,
        players: [
          { playerId: 'p1', displayName: 'Host One' },
          { playerId: 'p2', displayName: 'Alice' }
        ],
        roundState: {
          roundNumber: 1,
          phase: 'CHOOSING',
          starterPlayerId: 'p1',
          currentPlayerId: 'p1',
          lastAction: 'Duplicate ready'
        },
        boardState: {
          question: 'Duplicate question',
          category: 'OPEN',
          topic: 'Science',
          pegs: Array.from({ length: 10 }, (_, index) => ({
            index,
            state: 'hidden',
            value: null
          }))
        },
        totalScores: { p1: 0, p2: 0 },
        roundScores: { p1: 0, p2: 0 },
        statuses: { p1: 'ACTIVE', p2: 'ACTIVE' }
      },
      actionTokens: {
        p1: 'at_dup_1',
        p2: 'at_dup_2'
      }
    });
    fetchServerGameSession.mockResolvedValue({
      apiVersion: '1',
      gameId: 'game-review',
      winCondition: 30,
      activePlayerIndex: 0,
      players: [
        { playerId: 'p1', displayName: 'Host One' },
        { playerId: 'p2', displayName: 'Alice' }
      ],
      roundState: {
        roundNumber: 2,
        phase: 'CHOOSING',
        starterPlayerId: 'p1',
        currentPlayerId: 'p1',
        lastAction: 'Host One answered correctly (+1)'
      },
      boardState: {
        question: 'History review question',
        category: 'OPEN',
        topic: 'History',
        pegs: Array.from({ length: 10 }, (_, index) => ({
          index,
          state: 'hidden',
          value: null
        }))
      },
      totalScores: { p1: 3, p2: 1 },
      roundScores: { p1: 1, p2: 0 },
      statuses: { p1: 'ACTIVE', p2: 'ACTIVE' }
    });
    resumeServerGameSession.mockResolvedValue({
      snapshot: {
        apiVersion: '1',
        gameId: 'game-resume',
        winCondition: 30,
        activePlayerIndex: 0,
        players: [
          { playerId: 'p1', displayName: 'Host One' },
          { playerId: 'p2', displayName: 'Alice' }
        ],
        roundState: {
          roundNumber: 2,
          phase: 'CHOOSING',
          starterPlayerId: 'p1',
          currentPlayerId: 'p1',
          lastAction: 'Host One resumed control'
        },
        boardState: {
          question: 'Resume question',
          category: 'OPEN',
          topic: 'Science',
          pegs: Array.from({ length: 10 }, (_, index) => ({
            index,
            state: 'hidden',
            value: null
          }))
        },
        totalScores: { p1: 2, p2: 1 },
        roundScores: { p1: 0, p2: 0 },
        statuses: { p1: 'ACTIVE', p2: 'ACTIVE' }
      },
      actionTokens: {
        p1: 'at_resume_1',
        p2: 'at_resume_2'
      }
    });
  });

  test('applies tenant branding + settings from runtime me endpoints', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Science', count: 12 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pilot-monthly'
      }
    });

    render(<App />);

    await screen.findByRole('button', { name: /start game/i });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Northwind Quiz' })).toBeInTheDocument();
    });
    expect(screen.getByTestId('tenant-runtime-hint')).toHaveTextContent('tenant-northwind');
    expect(screen.getByTestId('tenant-runtime-hint')).toHaveTextContent('pilot-monthly');
    expect(document.title).toBe('Northwind Quiz');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#223344');
    expect(document.documentElement.style.getPropertyValue('--accent2')).toBe('#556677');
  });

  test('prepares duplicate setup from recent hosted session history', async () => {
    localStorage.setItem('smartiq.roomSession', JSON.stringify({
      roomCode: 'QUIZ42',
      playerId: 'p1',
      authToken: 'rt_room_1',
      displayName: 'Host One',
      role: 'host',
      roomState: {
        roomCode: 'QUIZ42',
        players: [
          { playerId: 'p1', displayName: 'Host One' },
          { playerId: 'p2', displayName: 'Alice' }
        ]
      }
    }));
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-1',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-77',
        metadata: {
          gameId: 'game-77',
          topic: 'Science',
          language: 'et',
          playerCount: 2
        }
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    await screen.findByRole('button', { name: /duplicate setup/i });
    fireEvent.click(screen.getByRole('button', { name: /duplicate setup/i }));

    await waitFor(() => expect(screen.getByTestId('workspace-message')).toHaveTextContent(/duplicate setup ready/i));
    expect(screen.getByTestId('active-filter')).toHaveTextContent(/science \| en/i);
    expect(screen.getAllByText('Host One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  test('prepares duplicate setup from recent hosted session player count without saved room roster', async () => {
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-2',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-88',
        metadata: {
          gameId: 'game-88',
          topic: 'History',
          language: 'en',
          playerCount: 3
        }
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    await screen.findByRole('button', { name: /duplicate setup/i });
    fireEvent.click(screen.getByRole('button', { name: /duplicate setup/i }));

    await waitFor(() => expect(screen.getByTestId('workspace-message')).toHaveTextContent(/placeholder player slots/i));
    expect(screen.getByTestId('active-filter')).toHaveTextContent(/history \| en/i);
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.getByText('Player 3')).toBeInTheDocument();
  });

  test('launches duplicate live session from recent host history', async () => {
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-3',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-99',
        metadata: {
          gameId: 'game-99',
          topic: 'Science',
          language: 'en',
          playerCount: 2
        }
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    await screen.findByRole('button', { name: /launch duplicate/i });
    fireEvent.click(screen.getByRole('button', { name: /launch duplicate/i }));

    await waitFor(() => expect(duplicateServerGameSession).toHaveBeenCalledWith('game-99'));
    await waitFor(() => expect(screen.getByText(/duplicate question/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument();
  });

  test('resumes live hosted session from recent host history', async () => {
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-5',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-resume',
        metadata: {
          gameId: 'game-resume',
          topic: 'Science',
          language: 'en',
          playerCount: 2
        }
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    await screen.findByRole('button', { name: /resume live/i });
    fireEvent.click(screen.getByRole('button', { name: /resume live/i }));

    await waitFor(() => expect(resumeServerGameSession).toHaveBeenCalledWith('game-resume'));
    await waitFor(() => expect(screen.getByText(/resume question/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument();
  });

  test('reviews recent hosted session state from host history', async () => {
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-4',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-review',
        metadata: {
          gameId: 'game-review',
          topic: 'History',
          language: 'et',
          playerCount: 2
        }
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    await screen.findByRole('button', { name: /review session/i });
    fireEvent.click(screen.getByRole('button', { name: /review session/i }));

    await waitFor(() => expect(fetchServerGameSession).toHaveBeenCalledWith('game-review'));
    expect(screen.getByTestId('recent-hosted-session-review')).toHaveTextContent('History review question');
    expect(screen.getByTestId('recent-hosted-session-review')).toHaveTextContent('game-review');
    expect(screen.getByTestId('recent-hosted-session-review')).toHaveTextContent('Host One');
    expect(screen.getByTestId('recent-hosted-session-review')).toHaveTextContent('3 pts');
  });

  test('selected session detail workspace can resume live control from review panel', async () => {
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-6',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-review',
        metadata: {
          gameId: 'game-review',
          topic: 'History',
          language: 'et',
          playerCount: 2
        }
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /review session/i }));

    await waitFor(() => expect(fetchServerGameSession).toHaveBeenCalledWith('game-review'));
    const reviewPanel = screen.getByTestId('recent-hosted-session-review');
    expect(reviewPanel).toHaveTextContent(/status: live/i);
    expect(reviewPanel).toHaveTextContent(/current leader: host one \(3 pts\)/i);
    fireEvent.click(within(reviewPanel).getByRole('button', { name: /resume live/i }));

    await waitFor(() => expect(resumeServerGameSession).toHaveBeenCalledWith('game-review'));
    await waitFor(() => expect(screen.getByText(/resume question/i)).toBeInTheDocument());
  });

  test('filters recent hosted sessions by live vs completed status', async () => {
    fetchTopics.mockResolvedValue([
      { topic: 'Science', count: 12 },
      { topic: 'History', count: 10 }
    ]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true
      }
    });
    fetchTenantAuditEvents.mockResolvedValue([
      {
        auditEventId: 'evt-7',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-live',
        metadata: {
          gameId: 'game-live',
          topic: 'Live Science',
          language: 'en',
          playerCount: 2
        },
        eventTime: '2026-03-06T10:00:00Z'
      },
      {
        auditEventId: 'evt-8',
        action: 'HOST_GAME_SESSION_CREATED',
        entityId: 'game-complete',
        metadata: {
          gameId: 'game-complete',
          topic: 'Final History',
          language: 'et',
          playerCount: 3
        },
        eventTime: '2026-03-06T09:00:00Z'
      },
      {
        auditEventId: 'evt-9',
        action: 'HOST_GAME_SESSION_COMPLETED',
        entityId: 'game-complete',
        metadata: {
          gameId: 'game-complete',
          topic: 'Final History',
          winnerDisplayName: 'Alice',
          winnerScore: 7
        },
        eventTime: '2026-03-06T11:00:00Z'
      }
    ]);

    render(<App />);

    await waitFor(() => expect(fetchTenantAuditEvents).toHaveBeenCalled());
    expect(screen.getByText(/live science/i)).toBeInTheDocument();
    expect(screen.getByText(/final history/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^completed$/i }));

    expect(screen.queryByText(/live science/i)).not.toBeInTheDocument();
    expect(screen.getByText(/final history/i)).toBeInTheDocument();
    expect(screen.getByText(/winner alice/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^completed$/i).length).toBeGreaterThan(0);
  });
});
