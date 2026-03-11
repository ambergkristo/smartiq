import { normalizeRoomCodeInput } from './roomRuntime';

function normalizeBranding(rawBranding) {
  if (!rawBranding || typeof rawBranding !== 'object') {
    return null;
  }
  return {
    appName: String(rawBranding.appName || '').trim(),
    logoUrl: String(rawBranding.logoUrl || '').trim(),
    primaryColor: String(rawBranding.primaryColor || '').trim(),
    secondaryColor: String(rawBranding.secondaryColor || '').trim()
  };
}

function normalizeActiveGame(rawActiveGame, fallbackRoomCode = '') {
  if (!rawActiveGame || typeof rawActiveGame !== 'object') {
    return null;
  }
  const gameId = String(rawActiveGame.gameId || '').trim();
  if (!gameId) {
    return null;
  }
  const totalScores = rawActiveGame.totalScores && typeof rawActiveGame.totalScores === 'object'
    ? rawActiveGame.totalScores
    : {};
  const roundScores = rawActiveGame.roundScores && typeof rawActiveGame.roundScores === 'object'
    ? rawActiveGame.roundScores
    : {};
  const statuses = rawActiveGame.statuses && typeof rawActiveGame.statuses === 'object'
    ? rawActiveGame.statuses
    : {};
  const playerDisplayNames = rawActiveGame.playerDisplayNames && typeof rawActiveGame.playerDisplayNames === 'object'
    ? rawActiveGame.playerDisplayNames
    : {};
  const pegs = Array.isArray(rawActiveGame.pegs)
    ? rawActiveGame.pegs
      .map((peg) => {
        if (!peg || typeof peg !== 'object' || !Number.isInteger(peg.index)) {
          return null;
        }
        return {
          index: peg.index,
          state: String(peg.state || '').trim().toLowerCase(),
          value: String(peg.value || '').trim()
        };
      })
      .filter(Boolean)
    : [];

  return {
    gameId,
    roomCode: normalizeRoomCodeInput(rawActiveGame.roomCode || fallbackRoomCode),
    winCondition: Number.isInteger(rawActiveGame.winCondition) ? rawActiveGame.winCondition : 0,
    roundNumber: Number.isInteger(rawActiveGame.roundNumber) ? rawActiveGame.roundNumber : 0,
    phase: String(rawActiveGame.phase || '').trim().toUpperCase(),
    topic: String(rawActiveGame.topic || '').trim(),
    question: String(rawActiveGame.question || '').trim(),
    lastAction: String(rawActiveGame.lastAction || '').trim(),
    starterPlayerId: String(rawActiveGame.starterPlayerId || '').trim(),
    currentPlayerId: String(rawActiveGame.currentPlayerId || '').trim(),
    currentPlayerDisplayName: String(rawActiveGame.currentPlayerDisplayName || '').trim(),
    playerDisplayNames,
    pegs,
    totalScores,
    roundScores,
    statuses
  };
}

export function normalizeRoomStateSnapshot(rawRoomState, fallbackRoomCode = '') {
  if (!rawRoomState || typeof rawRoomState !== 'object') {
    return null;
  }
  const roomCode = normalizeRoomCodeInput(rawRoomState.roomCode || fallbackRoomCode);
  const players = Array.isArray(rawRoomState.players)
    ? rawRoomState.players
      .map((player) => {
        if (!player || typeof player !== 'object') {
          return null;
        }
        const playerId = String(player.playerId || '').trim();
        const displayName = String(player.displayName || '').trim();
        if (!playerId && !displayName) {
          return null;
        }
        return {
          playerId,
          displayName
        };
      })
      .filter(Boolean)
    : [];

  if (!roomCode || players.length === 0) {
    return null;
  }

  return {
    roomCode,
    branding: normalizeBranding(rawRoomState.branding),
    activeGame: normalizeActiveGame(rawRoomState.activeGame, roomCode),
    players
  };
}

export function extractRoomStateFromRealtimeEvent(rawEvent, fallbackRoomCode = '') {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null;
  }
  const payload = rawEvent.payload;
  const type = String(rawEvent.type || '').trim().toUpperCase();

  if (type === 'PLAYER_JOINED' && payload && typeof payload === 'object') {
    return normalizeRoomStateSnapshot(payload.roomState, fallbackRoomCode);
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return normalizeRoomStateSnapshot(payload, fallbackRoomCode);
}
