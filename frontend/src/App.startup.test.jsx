import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    bootstrapOnboardingTenant: vi.fn(),
    clearRuntimeAuthContext: vi.fn(),
    completeRuntimeAuth: vi.fn(),
    createRoomSession: vi.fn(),
    deleteRuntimeSessionTemplate: vi.fn(),
    duplicateServerGameSession: vi.fn(),
    fetchRoomPreview: vi.fn(),
    fetchTenantAuditEvents: vi.fn(),
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    fetchServerGameSession: vi.fn(),
    resumeServerGameSession: vi.fn(),
    fetchTenantRuntimeSnapshot: vi.fn(),
    fetchTenantUsageSummary: vi.fn(),
    hasRuntimeAuthContext: vi.fn(() => false),
    initiateCheckoutSession: vi.fn(),
    joinRoomSession: vi.fn(),
    logoutRuntimeAuth: vi.fn(),
    rejoinRoomSession: vi.fn(),
    requestRuntimeAuthLink: vi.fn(),
    setRuntimeAuthContext: vi.fn(),
    upsertRuntimeSessionTemplate: vi.fn(),
    updateRuntimeTenantBranding: vi.fn(),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Backend is unreachable.',
      detail: 'Verify backend URL and that the API server is running.',
      kind: 'backend-unreachable'
    }))
  };
});

import {
  bootstrapOnboardingTenant,
  clearRuntimeAuthContext,
  completeRuntimeAuth,
  createRoomSession,
  deleteRuntimeSessionTemplate,
  fetchRoomPreview,
  fetchTenantAuditEvents,
  fetchTenantRuntimeSnapshot,
  fetchTopics,
  fetchTenantUsageSummary,
  hasRuntimeAuthContext,
  initiateCheckoutSession,
  joinRoomSession,
  rejoinRoomSession,
  requestRuntimeAuthLink,
  resolveTopicsErrorState,
  setRuntimeAuthContext,
  upsertRuntimeSessionTemplate,
  updateRuntimeTenantBranding
} from './api';

describe('App startup resilience', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.hash = '';
    window.history.pushState({}, '', '/');
    document.documentElement.removeAttribute('data-theme');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchRoomPreview.mockResolvedValue({
      roomCode: 'QUIZ42',
      branding: {
        appName: 'Northwind Quiz',
        primaryColor: '#223344',
        secondaryColor: '#556677'
      },
      players: [
        { playerId: 'p1', displayName: 'Host One' },
        { playerId: 'p2', displayName: 'Alice' }
      ]
    });
    fetchTenantAuditEvents.mockResolvedValue([]);
    fetchTenantUsageSummary.mockResolvedValue([]);
    updateRuntimeTenantBranding.mockResolvedValue({
      tenantId: 'tenant-branding',
      branding: {
        appName: 'Northwind Quiz',
        logoUrl: 'https://cdn.example.com/northwind.svg',
        primaryColor: '#223344',
        secondaryColor: '#556677'
      }
    });
    upsertRuntimeSessionTemplate.mockResolvedValue({
      tenantId: 'tenant-template',
      templates: []
    });
    deleteRuntimeSessionTemplate.mockResolvedValue({
      tenantId: 'tenant-template',
      templates: []
    });
    createRoomSession.mockResolvedValue({
      roomCode: 'ABC123',
      playerId: 'p1',
      authToken: 'rt_room_1'
    });
    joinRoomSession.mockResolvedValue({
      roomCode: 'ABC123',
      playerId: 'p2',
      authToken: 'rt_room_2'
    });
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'ABC123',
      playerId: 'p1',
      authToken: 'rt_room_resumed',
      roomState: {
        roomCode: 'ABC123',
        players: [
          { playerId: 'p1', displayName: 'Host' }
        ]
      }
    });
  });

  afterEach(() => {
    window.location.hash = '';
    window.history.pushState({}, '', '/');
    consoleErrorSpy.mockRestore();
  });

  test('shows loading state before topics resolve', () => {
    fetchTopics.mockImplementation(() => new Promise(() => {}));

    render(<App />);

    expect(screen.getByTestId('setup-skeleton')).toBeInTheDocument();
  });

  test('shows dev build badge marker', () => {
    fetchTopics.mockImplementation(() => new Promise(() => {}));

    render(<App />);

    expect(screen.getByTestId('build-badge')).toHaveTextContent(/dev build/i);
  });

  test('shows actionable backend error with retry', async () => {
    fetchTopics.mockRejectedValue(new Error('network'));

    render(<App />);

    await waitFor(() => expect(screen.getByText(/backend is unreachable/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByText(/check backend url/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open health/i })).toBeInTheDocument();
  });

  test('shows empty topics state', async () => {
    fetchTopics.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/no topics yet/i)).toBeInTheDocument());
  });

  test('renders setup screen when topics are available', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /topic options/i })).toBeInTheDocument();
    expect(screen.getByTestId('active-filter')).toHaveTextContent(/any topic \| en/i);
  });

  test('persists audio controls state between renders', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);

    const { unmount } = render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const muteToggle = screen.getByRole('button', { name: /sound on/i });
    const volumeSlider = screen.getByLabelText(/volume/i);

    fireEvent.click(muteToggle);
    fireEvent.change(volumeSlider, { target: { value: '30' } });
    expect(screen.getByRole('button', { name: /muted/i })).toBeInTheDocument();

    unmount();
    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /muted/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/volume/i)).toHaveValue('30');
  });

  test('applies selected theme to document root', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: 'ocean' } });

    expect(document.documentElement).toHaveAttribute('data-theme', 'ocean');
  });

  test('maps forbidden state with explicit message', async () => {
    fetchTopics.mockRejectedValue(new Error('403'));
    resolveTopicsErrorState.mockReturnValue({
      title: 'Forbidden (CORS/security).',
      detail: 'Check dev env / CORS origins.',
      kind: 'forbidden'
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText(/forbidden/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('shows not found startup error copy', async () => {
    fetchTopics.mockRejectedValue(new Error('404'));
    resolveTopicsErrorState.mockReturnValue({
      title: 'Not found.',
      detail: 'Topics endpoint is missing or routed incorrectly.',
      kind: 'not-found'
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
  });

  test('retry button re-requests topics', async () => {
    fetchTopics
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ topic: 'Science', count: 20 }]);

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
  });

  test('bootstraps onboarding workspace and applies tenant runtime snapshot', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    bootstrapOnboardingTenant.mockResolvedValue({
      runtimeAuth: {
        bearerToken: 'Bearer boot-token',
        userEmail: 'owner@northwind.test',
        tenantId: 'tenant-northwind'
      }
    });
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
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

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/workspace name/i), { target: { value: 'Northwind Quiz Night' } });
    fireEvent.change(screen.getByLabelText(/owner email/i), { target: { value: 'owner@northwind.test' } });
    fireEvent.change(screen.getByLabelText(/display name \(optional\)/i), { target: { value: 'Northwind Owner' } });
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    await waitFor(() => expect(bootstrapOnboardingTenant).toHaveBeenCalledWith({
      workspaceName: 'Northwind Quiz Night',
      ownerEmail: 'owner@northwind.test',
      ownerDisplayName: 'Northwind Owner'
    }));
    expect(setRuntimeAuthContext).toHaveBeenCalledWith({
      bearerToken: 'Bearer boot-token',
      userEmail: 'owner@northwind.test',
      tenantId: 'tenant-northwind'
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Northwind Quiz' })).toBeInTheDocument());
    expect(screen.getByTestId('tenant-runtime-hint')).toHaveTextContent('tenant-northwind');
    expect(screen.queryByTestId('onboarding-panel')).not.toBeInTheDocument();
  });

  test('restores host session through sign-in flow', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    requestRuntimeAuthLink.mockResolvedValue({
      challengeToken: 'ml_token_1'
    });
    completeRuntimeAuth.mockResolvedValue({
      runtimeAuth: {
        bearerToken: 'Bearer sign-in-token',
        userEmail: 'owner@northwind.test',
        tenantId: 'tenant-signin'
      }
    });
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-signin'
      },
      settings: {
        settings: {
          theme: 'ember'
        }
      },
      branding: {
        branding: {
          appName: 'Signin Quiz'
        }
      },
      subscription: {
        planCode: 'pilot-monthly'
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /send sign-in link/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/host email/i), { target: { value: 'owner@northwind.test' } });
    fireEvent.change(screen.getByLabelText(/tenant id/i), { target: { value: 'tenant-signin' } });
    fireEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    await waitFor(() => expect(requestRuntimeAuthLink).toHaveBeenCalledWith({
      email: 'owner@northwind.test',
      tenantId: 'tenant-signin'
    }));
    expect(completeRuntimeAuth).toHaveBeenCalledWith({ challengeToken: 'ml_token_1' });
    expect(setRuntimeAuthContext).toHaveBeenCalledWith({
      bearerToken: 'Bearer sign-in-token',
      userEmail: 'owner@northwind.test',
      tenantId: 'tenant-signin'
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Signin Quiz' })).toBeInTheDocument());
  });

  test('clears invalid stored session and shows recovery warning', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    const expiredError = new Error('expired');
    expiredError.code = 'INVALID_AUTH_CONTEXT';
    fetchTenantRuntimeSnapshot.mockRejectedValue(expiredError);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/host session expired or is invalid/i)).toBeInTheDocument());
    expect(clearRuntimeAuthContext).toHaveBeenCalled();
  });

  test('blocks hosted launch when tenant subscription is past due', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    initiateCheckoutSession.mockResolvedValue({
      checkoutSessionId: 'chk_restore_1',
      checkoutUrl: 'https://billing.smartiq.test/checkout?session_id=chk_restore_1'
    });
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-past-due'
      },
      settings: { settings: { theme: 'classic' } },
      branding: { branding: { appName: 'Past Due Quiz' } },
      subscription: {
        planCode: 'pilot-monthly',
        status: 'past_due',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'trial',
        maxHostedPlayers: 4,
        analyticsHistoryEnabled: false
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('host-launch-blocked')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /restore billing/i }));
    await waitFor(() => expect(initiateCheckoutSession).toHaveBeenCalledWith({
      planCode: 'pilot-monthly',
      billingCycle: 'monthly'
    }));
    expect(screen.getByTestId('checkout-link')).toHaveAttribute('href', 'https://billing.smartiq.test/checkout?session_id=chk_restore_1');
  });

  test('shows upgrade boundary when hosted player count exceeds plan cap', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-trial'
      },
      settings: { settings: { theme: 'classic' } },
      branding: { branding: { appName: 'Trial Quiz' } },
      subscription: {
        planCode: 'pilot-monthly',
        status: 'trialing',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'trial',
        maxHostedPlayers: 4,
        analyticsHistoryEnabled: false
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/players/i), { target: { value: 'A, B, C, D, E' } });
    fireEvent.blur(screen.getByLabelText(/players/i), { target: { value: 'A, B, C, D, E' } });

    await waitFor(() => expect(screen.getByTestId('host-player-cap-warning')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled();
    expect(fetchTenantAuditEvents).not.toHaveBeenCalled();
    expect(fetchTenantUsageSummary).not.toHaveBeenCalled();
  });

  test('shows locked custom-branding boundary for trial hosts', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-trial',
        selectedRole: 'owner'
      },
      settings: { settings: { theme: 'classic' } },
      branding: { branding: { appName: 'Trial Quiz', primaryColor: '#223344', secondaryColor: '#556677' } },
      subscription: {
        planCode: 'pilot-monthly',
        status: 'trialing',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'trial',
        maxHostedPlayers: 4,
        analyticsHistoryEnabled: false,
        sessionTemplatesEnabled: false,
        customBrandingEnabled: false
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('branding-locked')).toBeInTheDocument());
    expect(screen.getByTestId('branding-editor-card')).toHaveTextContent(/custom branding unlocks on pro host/i);
    expect(screen.queryByLabelText(/brand app name/i)).not.toBeInTheDocument();
  });

  test('saves tenant branding for pro host owners from host workspace', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-pro',
        selectedRole: 'owner'
      },
      settings: { settings: { theme: 'classic' } },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          logoUrl: 'https://cdn.example.com/northwind.svg',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host-monthly',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true,
        sessionTemplatesEnabled: true,
        customBrandingEnabled: true
      }
    });
    updateRuntimeTenantBranding.mockResolvedValue({
      tenantId: 'tenant-pro',
      branding: {
        appName: 'Late Night Quiz',
        logoUrl: 'https://cdn.example.com/late-night.svg',
        primaryColor: '#101820',
        secondaryColor: '#FEE715'
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/brand app name/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/brand app name/i), { target: { value: 'Late Night Quiz' } });
    fireEvent.change(screen.getByLabelText(/logo url/i), { target: { value: 'https://cdn.example.com/late-night.svg' } });
    fireEvent.change(screen.getByLabelText(/primary color/i), { target: { value: '#101820' } });
    fireEvent.change(screen.getByLabelText(/secondary color/i), { target: { value: '#FEE715' } });
    fireEvent.click(screen.getByRole('button', { name: /save branding/i }));

    await waitFor(() => expect(updateRuntimeTenantBranding).toHaveBeenCalledWith({
      appName: 'Late Night Quiz',
      logoUrl: 'https://cdn.example.com/late-night.svg',
      primaryColor: '#101820',
      secondaryColor: '#FEE715'
    }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Late Night Quiz' })).toBeInTheDocument());
    expect(screen.getByTestId('branding-message')).toHaveTextContent(/branding updated/i);
    expect(document.title).toBe('Late Night Quiz');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#101820');
    expect(document.documentElement.style.getPropertyValue('--accent2')).toBe('#FEE715');
  });

  test('shows locked session-template boundary for trial hosts', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-trial',
        selectedRole: 'owner'
      },
      settings: { settings: { schemaVersion: 1, theme: 'classic', host: { sessionTemplates: [] } } },
      branding: { branding: { appName: 'Trial Quiz', primaryColor: '#223344', secondaryColor: '#556677' } },
      subscription: {
        planCode: 'pilot-monthly',
        status: 'trialing',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'trial',
        maxHostedPlayers: 4,
        analyticsHistoryEnabled: false,
        sessionTemplatesEnabled: false,
        customBrandingEnabled: false
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('session-templates-locked')).toBeInTheDocument());
    expect(screen.getByTestId('session-templates-card')).toHaveTextContent(/session templates unlock on pro host/i);
    expect(screen.queryByLabelText(/template name/i)).not.toBeInTheDocument();
  });

  test('saves current host setup as a paid session template', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-pro',
        selectedRole: 'owner'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ember',
          host: {
            sessionTemplates: []
          }
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          logoUrl: 'https://cdn.example.com/northwind.svg',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pro-host-monthly',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true,
        sessionTemplatesEnabled: true,
        customBrandingEnabled: true
      }
    });
    upsertRuntimeSessionTemplate.mockResolvedValue({
      tenantId: 'tenant-pro',
      templates: [
        {
          templateId: 'tpl-friday',
          name: 'Friday default',
          topic: 'Math',
          language: 'en',
          theme: 'ember',
          players: ['Alice', 'Bob'],
          updatedAt: '2026-03-06T12:00:00Z'
        }
      ]
    });

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/template name/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/players/i), { target: { value: 'Alice, Bob' } });
    fireEvent.blur(screen.getByLabelText(/players/i), { target: { value: 'Alice, Bob' } });
    fireEvent.change(screen.getByLabelText(/template name/i), { target: { value: 'Friday default' } });
    fireEvent.click(screen.getByRole('button', { name: /save current setup/i }));

    await waitFor(() => expect(upsertRuntimeSessionTemplate).toHaveBeenCalledWith(
      expect.any(String),
      {
        name: 'Friday default',
        topic: '',
        language: 'en',
        theme: 'ember',
        players: ['Alice', 'Bob']
      }
    ));
    expect(screen.getByTestId('session-template-message')).toHaveTextContent(/session template saved/i);
    expect(screen.getByText('Friday default')).toBeInTheDocument();
  });

  test('applies and deletes a saved session template from host workspace', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        selectedTenantId: 'tenant-pro',
        selectedRole: 'owner'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'classic',
          host: {
            sessionTemplates: [
              {
                templateId: 'tpl-ocean',
                name: 'Ocean science',
                topic: 'Science',
                language: 'en',
                theme: 'ocean',
                players: ['Host One', 'Alice', 'Bob'],
                updatedAt: '2026-03-06T12:00:00Z'
              }
            ]
          }
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
        planCode: 'pro-host-monthly',
        status: 'active',
        billingCycle: 'monthly'
      },
      capabilities: {
        planTier: 'pro_host',
        maxHostedPlayers: 10,
        analyticsHistoryEnabled: true,
        sessionTemplatesEnabled: true,
        customBrandingEnabled: true
      }
    });
    deleteRuntimeSessionTemplate.mockResolvedValue({
      tenantId: 'tenant-pro',
      templates: []
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText('Ocean science')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /apply template/i }));

    await waitFor(() => expect(screen.getByTestId('session-template-message')).toHaveTextContent(/template applied/i));
    expect(screen.getByTestId('active-filter')).toHaveTextContent(/science \| en/i);
    expect(document.documentElement).toHaveAttribute('data-theme', 'ocean');
    expect(screen.getByText('Host One')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete template/i }));

    await waitFor(() => expect(deleteRuntimeSessionTemplate).toHaveBeenCalledWith('tpl-ocean'));
    expect(screen.getByTestId('session-template-message')).toHaveTextContent(/session template deleted/i);
    expect(screen.queryByText('Ocean science')).not.toBeInTheDocument();
  });

  test('refreshes paid entitlements after billing success return', async () => {
    window.history.pushState({}, '', '/billing/success');
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot
      .mockResolvedValueOnce({
        me: {
          selectedTenantId: 'tenant-upgrade',
          selectedRole: 'owner'
        },
        settings: { settings: { theme: 'classic' } },
        branding: { branding: { appName: 'Trial Quiz', primaryColor: '#223344', secondaryColor: '#556677' } },
        subscription: {
          planCode: 'pilot-monthly',
          status: 'trialing',
          billingCycle: 'monthly'
        },
        capabilities: {
          planTier: 'trial',
          maxHostedPlayers: 4,
          analyticsHistoryEnabled: false,
          sessionTemplatesEnabled: false,
          customBrandingEnabled: false
        }
      })
      .mockResolvedValueOnce({
        me: {
          selectedTenantId: 'tenant-upgrade',
          selectedRole: 'owner'
        },
        settings: { settings: { theme: 'classic' } },
        branding: { branding: { appName: 'Pro Quiz', primaryColor: '#101820', secondaryColor: '#FEE715' } },
        subscription: {
          planCode: 'pro-host-monthly',
          status: 'active',
          billingCycle: 'monthly'
        },
        capabilities: {
          planTier: 'pro_host',
          maxHostedPlayers: 10,
          analyticsHistoryEnabled: true,
          sessionTemplatesEnabled: true,
          customBrandingEnabled: true
        }
      });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('upgrade-message')).toHaveTextContent(/billing restored/i));
    expect(screen.getByLabelText(/brand app name/i)).toBeInTheDocument();
    expect(screen.getByTestId('tenant-runtime-hint')).toHaveTextContent('pro-host-monthly');
    expect(document.title).toBe('Pro Quiz');
  });

  test('creates a shareable room and shows saved room session state', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'QUIZ42',
      playerId: 'p1',
      authToken: 'rt_room_host_rotated',
      roomState: {
        roomCode: 'QUIZ42',
        players: [
          { playerId: 'p1', displayName: 'Host One' },
          { playerId: 'p2', displayName: 'Alice' }
        ]
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('room-panel')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/room display name/i), { target: { value: 'Host One' } });
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => expect(createRoomSession).toHaveBeenCalledWith({ displayName: 'Host One' }));
    expect(rejoinRoomSession).toHaveBeenCalledWith('ABC123', {
      playerId: 'p1',
      authToken: 'rt_room_1'
    });
    await waitFor(() => expect(screen.getByTestId('room-session-card')).toBeInTheDocument());
    expect(screen.getByText('QUIZ42')).toBeInTheDocument();
    expect(screen.getByText(/room ready: QUIZ42/i)).toBeInTheDocument();
    expect(screen.getAllByText('Host One').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /use room players/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeEnabled());
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  test('joins a room into a dedicated player lobby surface', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    joinRoomSession.mockResolvedValue({
      roomCode: 'QUIZ42',
      playerId: 'p2',
      authToken: 'rt_room_player'
    });
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'QUIZ42',
      playerId: 'p2',
      authToken: 'rt_room_player_rotated',
      roomState: {
        roomCode: 'QUIZ42',
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        },
        players: [
          { playerId: 'p1', displayName: 'Host One' },
          { playerId: 'p2', displayName: 'Alice' }
        ]
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('room-panel')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/room display name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/room code/i), { target: { value: 'quiz42' } });
    fireEvent.click(screen.getByRole('button', { name: /join room/i }));

    await waitFor(() => expect(joinRoomSession).toHaveBeenCalledWith('QUIZ42', { displayName: 'Alice' }));
    await waitFor(() => expect(screen.getByTestId('player-lobby-panel')).toBeInTheDocument());
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent('QUIZ42');
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent('Alice');
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent('Northwind Quiz');
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent(/waiting for the host/i);
    expect(screen.queryByLabelText(/room display name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/room code/i)).not.toBeInTheDocument();
  });

  test('renders dedicated player join route and returns to host setup on back', async () => {
    window.location.hash = '#/join/quiz42';
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('player-route-panel')).toBeInTheDocument());
    await waitFor(() => expect(fetchRoomPreview).toHaveBeenCalledWith('QUIZ42'));
    expect(screen.getByTestId('player-route-panel')).toHaveTextContent('Northwind Quiz');
    expect(screen.getByTestId('player-route-panel')).toHaveTextContent('QUIZ42');
    expect(screen.getByTestId('player-route-preview')).toHaveTextContent('Host One');
    expect(screen.queryByTestId('room-panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to smartiq/i }));

    await waitFor(() => expect(screen.getByTestId('room-panel')).toBeInTheDocument());
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
  });

  test('joins through dedicated player route and switches into branded player lobby', async () => {
    window.location.hash = '#/join/quiz42';
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    joinRoomSession.mockResolvedValue({
      roomCode: 'QUIZ42',
      playerId: 'p2',
      authToken: 'rt_room_player'
    });
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'QUIZ42',
      playerId: 'p2',
      authToken: 'rt_room_player_rotated',
      roomState: {
        roomCode: 'QUIZ42',
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        },
        players: [
          { playerId: 'p1', displayName: 'Host One' },
          { playerId: 'p2', displayName: 'Alice' }
        ]
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('player-route-panel')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/your display name/i), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    await waitFor(() => expect(joinRoomSession).toHaveBeenCalledWith('QUIZ42', { displayName: 'Alice' }));
    expect(rejoinRoomSession).toHaveBeenCalledWith('QUIZ42', {
      playerId: 'p2',
      authToken: 'rt_room_player'
    });
    await waitFor(() => expect(screen.getByTestId('player-lobby-panel')).toBeInTheDocument());
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent('Northwind Quiz');
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent('Alice');
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent(/waiting for the host/i);
    expect(screen.queryByTestId('player-route-panel')).not.toBeInTheDocument();
  });

  test('resumes a saved room session from local storage', async () => {
    localStorage.setItem('smartiq.roomSession', JSON.stringify({
      roomCode: 'SAVE42',
      playerId: 'p3',
      authToken: 'rt_saved',
      displayName: 'Saved Player',
      role: 'player',
      roomState: {
        roomCode: 'SAVE42',
        branding: {
          appName: 'Saved Quiz',
          primaryColor: '#114455',
          secondaryColor: '#22aacc'
        },
        players: [{ playerId: 'p3', displayName: 'Saved Player' }]
      }
    }));
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    rejoinRoomSession.mockResolvedValue({
      roomCode: 'SAVE42',
      playerId: 'p3',
      authToken: 'rt_saved_rotated',
      roomState: {
        roomCode: 'SAVE42',
        branding: {
          appName: 'Saved Quiz',
          primaryColor: '#114455',
          secondaryColor: '#22aacc'
        },
        players: [
          { playerId: 'p1', displayName: 'Host' },
          { playerId: 'p3', displayName: 'Saved Player' }
        ]
      }
    });

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /resume room/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /resume room/i }));

    await waitFor(() => expect(rejoinRoomSession).toHaveBeenCalledWith('SAVE42', {
      playerId: 'p3',
      authToken: 'rt_saved'
    }));
    expect(screen.getByText(/resumed room: SAVE42/i)).toBeInTheDocument();
    expect(screen.getByTestId('player-lobby-panel')).toBeInTheDocument();
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent('Saved Quiz');
    expect(screen.getByTestId('player-lobby-panel')).toHaveTextContent(/waiting for the host/i);
    expect(screen.getAllByText('Saved Player').length).toBeGreaterThan(0);
  });
});
