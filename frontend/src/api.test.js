import { buildNextCardQuery, resolveCardErrorMessage, resolveTopicsErrorState } from './api';

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

  test('builds cards/next query with backend contract params', () => {
    const params = buildNextCardQuery({ topic: 'Science', difficulty: 'hard', language: 'et' });
    expect(params.get('topic')).toBe('Science');
    expect(params.get('difficulty')).toBe('3');
    expect(params.get('language')).toBe('et');
    expect(params.get('lang')).toBe('et');
  });
});
