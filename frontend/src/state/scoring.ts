export function expectedCorrectIndexes(card) {
  if (!card) return new Set();

  if (card.correct && Array.isArray(card.correct.correctIndexes)) {
    return new Set(card.correct.correctIndexes);
  }

  if (card.correct && Number.isInteger(card.correct.correctIndex)) {
    return new Set([card.correct.correctIndex]);
  }

  if (Array.isArray(card.correctFlags) && card.correctFlags.length === 10) {
    return new Set(
      card.correctFlags
        .map((flag, idx) => (flag ? idx : null))
        .filter((idx) => idx !== null)
    );
  }

  if (Number.isInteger(card.correctIndex)) {
    return new Set([card.correctIndex]);
  }

  return new Set();
}

function normalize(text) {
  return String(text ?? '').trim().toLowerCase();
}

export function evaluateAttempt(card, { selectedIndex, numberGuess, orderRank }) {
  const category = String(card?.category ?? 'OPEN').toUpperCase();

  if (!Number.isInteger(selectedIndex)) {
    return false;
  }

  if (category === 'ORDER') {
    const correctOrder = card?.correct?.correctOrder;
    if (!Array.isArray(correctOrder) || correctOrder.length !== 10) {
      return false;
    }
    if (!Number.isInteger(orderRank) || orderRank < 1 || orderRank > 10) {
      return false;
    }
    return correctOrder[selectedIndex] === orderRank;
  }

  if (category === 'NUMBER') {
    const correctIndex = card?.correct?.correctIndex ?? card?.correctIndex;
    const indexMatch = selectedIndex === correctIndex;
    const expectedValue = card?.correct?.correctValue;
    if (expectedValue == null || expectedValue === '') {
      return indexMatch;
    }
    return indexMatch && normalize(numberGuess) === normalize(expectedValue);
  }

  return expectedCorrectIndexes(card).has(selectedIndex);
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
