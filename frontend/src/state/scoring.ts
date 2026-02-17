export function expectedCorrectIndexes(card) {
  if (!card) return new Set();

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
