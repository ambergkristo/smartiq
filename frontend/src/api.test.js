import {
  clearRuntimeAuthContext,
  buildRoomPlayerRemovalPayload,
  buildRoomRejoinPayload,
  buildServerActionPayload,
  buildServerGamePayload,
  createRoomSession,
  createServerGameSession,
  deleteRuntimeSessionReviewNote,
  deleteRuntimeSessionTemplate,
  fetchTenantRuntimeSnapshot,
  removeRoomPlayerFromSession,
  upsertRuntimeSessionReviewNote,
  upsertRuntimeSessionTemplate,
  updateRuntimeTenantBranding,
  getRuntimeAuthContext,
  hasRuntimeAuthContext,
  resolveCardErrorMessage,
  resolveGameSessionErrorMessage,
  resolveTopicsErrorState,
  setRuntimeAuthContext
} from './api';
import { MAX_PLAYERS_PER_ROOM } from './constants/runtime';

describe('api error mapping', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });

  test('maps forbidden topics status without backend-unreachable message', () => {
    const state = resolveTopicsErrorState({ status: 403, code: 'HTTP_ERROR' });
    expect(state.kind).toBe('forbidden');
    expect(state.title.toLowerCase()).toContain('forbidden');
  });

  test('maps not-found topics status', () => {
    const state = resolveTopicsErrorState({ status: 404, code: 'HTTP_ERROR' });
    expect(state.kind).toBe('not-found');
  });

  test('maps server-error topics status', () => {
    const state = resolveTopicsErrorState({ status: 500, code: 'HTTP_ERROR' });
    expect(state.kind).toBe('server-error');
  });

  test('maps missing API base configuration error', () => {
    const state = resolveTopicsErrorState({ code: 'CONFIG_ERROR' });
    expect(state.kind).toBe('config-error');
    expect(state.title.toLowerCase()).toContain('not configured');
  });

  test('maps card conflict status', () => {
    expect(resolveCardErrorMessage({ status: 409, code: 'HTTP_ERROR' }).toLowerCase()).toContain('conflict');
  });

  test('maps card forbidden status', () => {
    expect(resolveCardErrorMessage({ status: 403, code: 'HTTP_ERROR' }).toLowerCase()).toContain('forbidden');
  });

  test('includes backend detail for card not found', () => {
    expect(resolveCardErrorMessage({
      status: 404,
      code: 'HTTP_ERROR',
      detail: 'No cards available for language=et, topic=any'
    })).toContain('No playable cards for this filter');
  });

  test('keeps generic backend detail for non-deck 404 errors', () => {
    expect(resolveCardErrorMessage({
      status: 404,
      code: 'HTTP_ERROR',
      detail: 'Card id not found'
    })).toContain('Not found. Card id not found');
  });

  test('builds server game payload with normalized players and defaults', () => {
    const payload = buildServerGamePayload({
      players: [' Alice ', 'Bob', ''],
      language: 'et',
      topic: '  Science ',
      winCondition: 30
    });

    expect(payload).toEqual({
      players: ['Alice', 'Bob'],
      language: 'en',
      topic: 'Science',
      winCondition: 30
    });
  });

  test('builds PASS action payload', () => {
    expect(buildServerActionPayload({ type: 'pass', actorPlayerId: 'p1', actionToken: 'at_1', actionRequestId: 'req-1' })).toEqual({
      type: 'PASS',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-1'
    });
  });

  test('builds ANSWER action payload with tile and optional rank', () => {
    expect(buildServerActionPayload({
      type: 'answer',
      tileIndex: 2,
      rank: 3,
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-2'
    })).toEqual({
      type: 'ANSWER',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-2',
      tileIndex: 2,
      rank: 3
    });
  });

  test('rejects ANSWER payload without tile index', () => {
    expect(() => buildServerActionPayload({
      type: 'ANSWER',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-3'
    })).toThrow('tileIndex is required for ANSWER');
  });

  test('rejects action payload without actorPlayerId', () => {
    expect(() => buildServerActionPayload({ type: 'PASS', actionToken: 'at_1', actionRequestId: 'req-4' })).toThrow('actorPlayerId is required');
  });

  test('rejects action payload without actionToken', () => {
    expect(() => buildServerActionPayload({ type: 'PASS', actorPlayerId: 'p1', actionRequestId: 'req-5' })).toThrow('actionToken is required');
  });

  test('rejects action payload without actionRequestId', () => {
    expect(() => buildServerActionPayload({ type: 'PASS', actorPlayerId: 'p1', actionToken: 'at_1' })).toThrow('actionRequestId is required');
  });

  test('builds room rejoin payload with trimmed fields', () => {
    expect(buildRoomRejoinPayload({ playerId: ' p1 ', authToken: ' rt_token ' })).toEqual({
      playerId: 'p1',
      authToken: 'rt_token'
    });
  });

  test('rejects room rejoin payload without playerId', () => {
    expect(() => buildRoomRejoinPayload({ authToken: 'rt_token' })).toThrow('playerId is required');
  });

  test('rejects room rejoin payload without authToken', () => {
    expect(() => buildRoomRejoinPayload({ playerId: 'p1' })).toThrow('authToken is required');
  });

  test('builds room player removal payload with required fields', () => {
    expect(buildRoomPlayerRemovalPayload({
      hostPlayerId: ' p1 ',
      hostAuthToken: ' rt_host ',
      targetPlayerId: ' p2 '
    })).toEqual({
      hostPlayerId: 'p1',
      hostAuthToken: 'rt_host',
      targetPlayerId: 'p2'
    });
  });

  test('maps game session not found to restart guidance', () => {
    expect(resolveGameSessionErrorMessage({ status: 404, code: 'HTTP_ERROR' }).toLowerCase()).toContain('not found');
  });

  test('maps game session validation payload errors', () => {
    expect(resolveGameSessionErrorMessage({ code: 'VALIDATION_ERROR', message: 'bad payload' })).toBe('bad payload');
  });

  test('maps game session contract mismatch errors', () => {
    expect(resolveGameSessionErrorMessage({
      code: 'CONTRACT_MISMATCH',
      message: 'Unsupported game session API version: 2'
    })).toBe('Unsupported game session API version: 2');
  });

  test('maps game session duplicate action conflict', () => {
    expect(resolveGameSessionErrorMessage({ status: 409, detail: 'duplicate actionRequestId' })).toContain('Duplicate game action');
  });

  test('maps game session machine-readable invalid action code', () => {
    expect(resolveGameSessionErrorMessage({ code: 'INVALID_ACTION', detail: 'type is required' }))
      .toBe('Invalid game action. type is required');
  });

  test('maps game session machine-readable game-not-found code', () => {
    expect(resolveGameSessionErrorMessage({ code: 'GAME_NOT_FOUND' }))
      .toBe('Game session was not found. Start a new game.');
  });

  test('maps tenant access block for hosted runtime', () => {
    expect(resolveGameSessionErrorMessage({
      code: 'FORBIDDEN_TENANT_ACCESS',
      detail: 'subscription status does not allow hosted runtime'
    })).toBe('Hosted runtime unavailable. subscription status does not allow hosted runtime');
  });

  test('stores and reads runtime auth context from localStorage', () => {
    const stored = setRuntimeAuthContext({
      userEmail: ' owner@acme.test ',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    expect(stored).toEqual({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'Bearer token-1'
    });
    expect(getRuntimeAuthContext()).toEqual(stored);
    expect(hasRuntimeAuthContext()).toBe(true);
  });

  test('clears runtime auth context', () => {
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });
    clearRuntimeAuthContext();
    expect(getRuntimeAuthContext()).toBeNull();
    expect(hasRuntimeAuthContext()).toBe(false);
  });

  test('sends runtime auth headers with server game session create', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      snapshot: { gameId: 'game-1' },
      actionTokens: {}
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await createServerGameSession({ players: ['Alice'], language: 'en', winCondition: 30 });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/game$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        })
      })
    );
  });

  test('sends runtime auth headers with room creation', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      roomCode: 'ABC123',
      playerId: 'p1',
      authToken: 'rt_123'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await createRoomSession({ displayName: 'Alice' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/rooms$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        })
      })
    );
  });

  test('sends runtime auth headers with host room player removal', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      roomCode: 'ABC123',
      players: [{ playerId: 'p1', displayName: 'Host' }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await removeRoomPlayerFromSession('ABC123', {
      hostPlayerId: 'p1',
      hostAuthToken: 'rt_host',
      targetPlayerId: 'p2'
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/rooms\/ABC123\/remove-player$/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        }),
        body: JSON.stringify({
          hostPlayerId: 'p1',
          hostAuthToken: 'rt_host',
          targetPlayerId: 'p2'
        })
      })
    );
  });

  test('sends runtime auth headers with tenant branding updates', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      tenantId: 'tenant-1',
      branding: {
        appName: 'Late Night Quiz',
        logoUrl: null,
        primaryColor: '#101820',
        secondaryColor: '#FEE715'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await updateRuntimeTenantBranding({
      appName: 'Late Night Quiz',
      logoUrl: '',
      primaryColor: '#101820',
      secondaryColor: '#FEE715'
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/tenant-branding$/),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        }),
        body: JSON.stringify({
          appName: 'Late Night Quiz',
          logoUrl: null,
          primaryColor: '#101820',
          secondaryColor: '#FEE715'
        })
      })
    );
  });

  test('sends runtime auth headers with session template upserts', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      tenantId: 'tenant-1',
      templates: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await upsertRuntimeSessionTemplate('tpl-1', {
      name: 'Friday default',
      topic: 'Science',
      language: 'en',
      theme: 'ember',
      players: ['Alice', 'Bob']
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/session-templates\/tpl-1$/),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        }),
        body: JSON.stringify({
          name: 'Friday default',
          topic: 'Science',
          language: 'en',
          theme: 'ember',
          players: ['Alice', 'Bob']
        })
      })
    );
  });

  test('sends runtime auth headers with session template deletes', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      tenantId: 'tenant-1',
      templates: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await deleteRuntimeSessionTemplate('tpl-1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/session-templates\/tpl-1$/),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        })
      })
    );
  });

  test('sends runtime auth headers with session review note upserts', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      tenantId: 'tenant-1',
      notes: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await upsertRuntimeSessionReviewNote('game-1', {
      note: 'Keep the opener shorter.'
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/session-review-notes\/game-1$/),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        }),
        body: JSON.stringify({
          note: 'Keep the opener shorter.'
        })
      })
    );
  });

  test('sends runtime auth headers with session review note deletes', async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      tenantId: 'tenant-1',
      notes: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    await deleteRuntimeSessionReviewNote('game-1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/session-review-notes\/game-1$/),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-SmartIQ-User-Email': 'owner@acme.test',
          'X-SmartIQ-Tenant-Id': 'tenant-1'
        })
      })
    );
  });

  test('loads tenant runtime snapshot with capabilities', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        selectedTenantId: 'tenant-1'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        settings: { theme: 'classic' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        branding: { appName: 'Acme Quiz' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        planCode: 'pilot-monthly',
        status: 'active'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        planTier: 'pro_host',
        maxHostedPlayers: MAX_PLAYERS_PER_ROOM,
        analyticsHistoryEnabled: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    setRuntimeAuthContext({
      userEmail: 'owner@acme.test',
      tenantId: 'tenant-1',
      bearerToken: 'token-1'
    });

    const snapshot = await fetchTenantRuntimeSnapshot();

    expect(snapshot?.me?.selectedTenantId).toBe('tenant-1');
    expect(snapshot?.subscription?.planCode).toBe('pilot-monthly');
    expect(snapshot?.capabilities?.planTier).toBe('pro_host');
    expect(snapshot?.capabilities?.maxHostedPlayers).toBe(MAX_PLAYERS_PER_ROOM);
    expect(snapshot?.capabilities?.analyticsHistoryEnabled).toBe(true);
  });
});
