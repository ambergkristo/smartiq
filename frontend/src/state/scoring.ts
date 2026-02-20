function toInt(value) {
  return Number.isInteger(value) ? value : Number.parseInt(value, 10);
}

export function cardCategory(card) {
  const raw = card?.category || card?.subtopic || 'OPEN';
  return String(raw).trim().toUpperCase();
}

export function expectedCorrectIndexes(card) {
  if (!card) return new Set();

  if (card.correct && Array.isArray(card.correct.correctIndexes)) {
    return new Set(card.correct.correctIndexes.filter((x) => Number.isInteger(x)));
  }

  if (Array.isArray(card.correctIndexes)) {
    return new Set(card.correctIndexes.filter((x) => Number.isInteger(x)));
  }

  if (Array.isArray(card.correctFlags) && card.correctFlags.length === 10) {
    return new Set(
      card.correctFlags
        .map((flag, idx) => (flag ? idx : null))
        .filter((idx) => idx !== null)
    );
  }

  const fromCorrect = toInt(card.correct?.correctIndex);
  if (Number.isInteger(fromCorrect)) {
    return new Set([fromCorrect]);
  }

  const fromLegacy = toInt(card.correctIndex);
  if (Number.isInteger(fromLegacy)) {
    return new Set([fromLegacy]);
  }

  return new Set();
}

export function evaluateAttempt(card, selectedIndex, selectedRank) {
  const category = cardCategory(card);
  const correct = card?.correct || {};
  const correctIndexes = expectedCorrectIndexes(card);

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 9) {
    return { correct: false, reason: 'invalid_selection' };
  }

  switch (category) {
    case 'TRUE_FALSE':
    case 'OPEN':
      return { correct: correctIndexes.has(selectedIndex), reason: 'index_match' };
    case 'NUMBER':
    case 'CENTURY_DECADE':
    case 'COLOR': {
      const idx = toInt(correct.correctIndex) ?? toInt(card.correctIndex);
      return { correct: idx === selectedIndex, reason: 'single_index_match' };
    }
    case 'ORDER': {
      const ranks = Array.isArray(correct.rankByIndex) ? correct.rankByIndex : Array.isArray(correct.correctOrder) ? correct.correctOrder : null;
      const rank = toInt(selectedRank);
      if (!ranks || ranks.length !== 10 || !Number.isInteger(rank) || rank < 1 || rank > 10) {
        return { correct: false, reason: 'missing_rank' };
      }
      return { correct: toInt(ranks[selectedIndex]) === rank, reason: 'rank_match' };
    }
    default:
      return { correct: correctIndexes.has(selectedIndex), reason: 'fallback' };
  }
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function scoreDelta(card, selectedIndexes, passed) {
  if (passed) return 0;
  return sameSet(expectedCorrectIndexes(card), selectedIndexes) ? 1 : 0;
}
