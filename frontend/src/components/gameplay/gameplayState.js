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

export function getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes, phase = 'QUESTION_ACTIVE') {
  if (revealedIndexes.has(index)) return 'correct';
  if (wrongIndexes.has(index)) return 'wrong';
  if (selectedIndexes.has(index)) return phase === 'ANSWER_SELECTED' ? 'locked' : 'selected';
  return 'default';
}

export function getPhaseLabel(phase) {
  return String(phase || '').replace(/_/g, ' ').toLowerCase();
}

export function getActionHint(phase, currentPlayer, category, controlsDisabled, mode = 'standard', hasSelection = false) {
  if (controlsDisabled && (
    phase === 'QUESTION_ACTIVE'
    || phase === 'ANSWER_SELECTED'
    || phase === 'ROUND_REVEAL'
    || phase === 'ROUND_SUCCESS'
    || phase === 'ROUND_FAIL'
  )) {
    return `Waiting for active player ${currentPlayer}. Controls are disabled on this client.`;
  }

  switch (phase) {
    case 'QUESTION_ACTIVE':
      if (mode === 'solo') {
        return hasSelection
          ? `${currentPlayer}: LOCK IN to risk the round reward.`
          : `${currentPlayer}: choose one answer, then LOCK IN.`;
      }
      return `${currentPlayer}: choose one answer, then SUBMIT PICK.`;
    case 'ANSWER_SELECTED':
      return `${currentPlayer}: LOCK IN or go BACK.`;
    case 'ROUND_REVEAL':
      return 'Correct answer locked. Press NEXT to continue the round.';
    case 'ROUND_SUCCESS':
      return 'Board cleared. Press NEXT to advance.';
    case 'ROUND_FAIL':
      return 'Wrong answer ends the round. Press NEXT to continue.';
    case 'LOADING_CARD':
      return 'Loading next round card...';
    default:
      return category === 'ORDER'
        ? 'Waiting for CherryPick-compatible board state...'
        : 'Waiting for game state update...';
  }
}

export function getCanAnswer(selectedIndexes, controlsDisabled) {
  return selectedIndexes.size > 0 && !controlsDisabled;
}

export function getAnswerStateCounts(selectedIndexes, revealedIndexes, wrongIndexes, optionCount) {
  const selected = selectedIndexes.size;
  const correct = revealedIndexes.size;
  const wrong = wrongIndexes.size;
  const available = Math.max(optionCount - selected - correct - wrong, 0);
  return { selected, correct, wrong, available };
}

export function getNextActionLabel(nextTransition) {
  if (nextTransition === 'game-over') {
    return 'VIEW RESULTS';
  }
  if (nextTransition === 'round') {
    return 'NEXT ROUND';
  }
  return 'NEXT';
}
