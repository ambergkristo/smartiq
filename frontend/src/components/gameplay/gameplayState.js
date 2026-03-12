export const CATEGORY_COLORS = {
  TRUE_FALSE: '#f28b23',
  NUMBER: '#f2cf1d',
  ORDER: '#5ea844',
  CENTURY_DECADE: '#1d3d8f',
  COLOR: '#e35fa8',
  OPEN: '#53bde0'
};

export function getCardCategory(card) {
  return String(card?.category || card?.subtopic || 'OPEN').toUpperCase();
}

export function getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes, phase = 'CHOOSING') {
  if (revealedIndexes.has(index)) return 'correct';
  if (wrongIndexes.has(index)) return 'wrong';
  if (selectedIndexes.has(index)) return phase === 'CONFIRMING' ? 'locked' : 'selected';
  return 'default';
}

export function getPhaseLabel(phase) {
  return String(phase || '').replace(/_/g, ' ').toLowerCase();
}

export function getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass) {
  if (controlsDisabled && (phase === 'CHOOSING' || phase === 'CONFIRMING' || phase === 'RESOLVED' || phase === 'PASSED')) {
    return `Waiting for active player ${currentPlayer}. Controls are disabled on this client.`;
  }

  if (category === 'ORDER' && phase === 'CHOOSING') {
    return `${currentPlayer}: choose rank ${selectedRank ?? '(1-10)'} and an answer, then ANSWER.`;
  }

  switch (phase) {
    case 'CHOOSING':
      return `${currentPlayer}: choose one answer, then ANSWER or PASS.`;
    case 'CONFIRMING':
      return `${currentPlayer}: LOCK IN or go BACK.`;
    case 'RESOLVED':
      return 'Attempt resolved. Press NEXT to continue.';
    case 'PASSED':
      return 'Player passed. Press NEXT for next turn.';
    case 'LOADING_CARD':
      return 'Loading next round card...';
    default:
      return 'Waiting for game state update...';
  }
}

export function getCanAnswer(category, selectedIndexes, selectedRank, controlsDisabled) {
  const requiresRank = category === 'ORDER';
  const hasSelectedAnswer = selectedIndexes.size > 0;
  return hasSelectedAnswer && (!requiresRank || selectedRank != null) && !controlsDisabled;
}

export function getAnswerStateCounts(selectedIndexes, revealedIndexes, wrongIndexes, optionCount) {
  const selected = selectedIndexes.size;
  const correct = revealedIndexes.size;
  const wrong = wrongIndexes.size;
  const available = Math.max(optionCount - selected - correct - wrong, 0);
  return { selected, correct, wrong, available };
}

export function getNextActionLabel(nextTransition) {
  if (nextTransition === 'round') {
    return 'NEXT ROUND';
  }
  if (nextTransition === 'game-over') {
    return 'VIEW WINNER';
  }
  return 'NEXT QUESTION';
}
