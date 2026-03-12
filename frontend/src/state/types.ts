export const GamePhase = {
  SETUP: 'SETUP',
  LOADING_CARD: 'LOADING_CARD',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  ANSWER_SELECTED: 'ANSWER_SELECTED',
  ROUND_REVEAL: 'ROUND_REVEAL',
  ROUND_SUCCESS: 'ROUND_SUCCESS',
  ROUND_FAIL: 'ROUND_FAIL',
  GAME_OVER: 'GAME_OVER'
};

export const DEFAULT_PLAYERS = ['Player 1'];
const ET_ENABLED = String(import.meta.env.VITE_ENABLE_ET || '').toLowerCase() === 'true';

export const DEFAULT_LANGS = ET_ENABLED ? ['en', 'et'] : ['en'];
