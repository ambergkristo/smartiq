export const GamePhase = {
  SETUP: 'SETUP',
  LOADING_CARD: 'LOADING_CARD',
  CHOOSING: 'CHOOSING',
  CONFIRMING: 'CONFIRMING',
  RESOLVED: 'RESOLVED',
  PASSED: 'PASSED',
  ROUND_SUMMARY: 'ROUND_SUMMARY',
  GAME_OVER: 'GAME_OVER'
};

export const DEFAULT_PLAYERS = ['Player 1'];
const ET_ENABLED = String(import.meta.env.VITE_ENABLE_ET || '').toLowerCase() === 'true';

export const DEFAULT_LANGS = ET_ENABLED ? ['en', 'et'] : ['en'];
