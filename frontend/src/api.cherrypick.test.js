import { buildServerActionPayload, resolveRoomSessionErrorMessage } from './api';

describe('CherryPick action payloads', () => {
  test('builds ANSWER payload without rank data', () => {
    expect(buildServerActionPayload({
      type: 'answer',
      tileIndex: 2,
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-1'
    })).toEqual({
      type: 'ANSWER',
      tileIndex: 2,
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-1'
    });
  });

  test('builds ADVANCE payload for post-round continuation', () => {
    expect(buildServerActionPayload({
      type: 'advance',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-2'
    })).toEqual({
      type: 'ADVANCE',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-2'
    });
  });

  test('rejects PASS payloads', () => {
    expect(() => buildServerActionPayload({
      type: 'PASS',
      actorPlayerId: 'p1',
      actionToken: 'at_1',
      actionRequestId: 'req-3'
    })).toThrow('Unsupported action type: PASS');
  });

  test('maps invalid room code errors to clean join copy', () => {
    expect(resolveRoomSessionErrorMessage({
      code: 'ROOM_NOT_FOUND',
      status: 404
    })).toBe('Game code not found. Check the code and try again.');
  });

  test('maps room validation errors to clean join copy', () => {
    expect(resolveRoomSessionErrorMessage({
      code: 'VALIDATION_ERROR',
      message: 'roomCode is required'
    })).toBe('Enter a valid game code.');
  });
});
