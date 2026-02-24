import {
  buildRoomRejoinPayload,
  buildServerActionPayload,
  buildServerGamePayload,
  resolveCardErrorMessage,
  resolveGameSessionErrorMessage,
  resolveTopicsErrorState
} from './api';

describe('api error mapping', () => {
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
    expect(buildServerActionPayload({ type: 'pass', actorPlayerId: 'p1', actionToken: 'at_1' })).toEqual({
      type: 'PASS',
      actorPlayerId: 'p1',
      actionToken: 'at_1'
    });
  });

  test('builds ANSWER action payload with tile and optional rank', () => {
    expect(buildServerActionPayload({
      type: 'answer',
      tileIndex: 2,
      rank: 3,
      actorPlayerId: 'p1',
      actionToken: 'at_1'
    })).toEqual({
      type: 'ANSWER',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      tileIndex: 2,
      rank: 3
    });
  });

  test('rejects ANSWER payload without tile index', () => {
    expect(() => buildServerActionPayload({
      type: 'ANSWER',
      actorPlayerId: 'p1',
      actionToken: 'at_1'
    })).toThrow('tileIndex is required for ANSWER');
  });

  test('rejects action payload without actorPlayerId', () => {
    expect(() => buildServerActionPayload({ type: 'PASS', actionToken: 'at_1' })).toThrow('actorPlayerId is required');
  });

  test('rejects action payload without actionToken', () => {
    expect(() => buildServerActionPayload({ type: 'PASS', actorPlayerId: 'p1' })).toThrow('actionToken is required');
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

  test('maps game session not found to restart guidance', () => {
    expect(resolveGameSessionErrorMessage({ status: 404, code: 'HTTP_ERROR' }).toLowerCase()).toContain('not found');
  });

  test('maps game session validation payload errors', () => {
    expect(resolveGameSessionErrorMessage({ code: 'VALIDATION_ERROR', message: 'bad payload' })).toBe('bad payload');
  });
});
