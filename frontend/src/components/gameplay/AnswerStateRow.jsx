import { getAnswerStateCounts } from './gameplayState';

function StatePill({ label, value, tone = 'neutral' }) {
  return (
    <div className={`answer-state-pill answer-state-pill--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function AnswerStateRow({
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  optionCount,
  canPass
}) {
  const counts = getAnswerStateCounts(selectedIndexes, revealedIndexes, wrongIndexes, optionCount);

  return (
    <div className="answer-state-row" data-testid="answer-state-row">
      <StatePill label="Selected" value={counts.selected} tone="selected" />
      <StatePill label="Correct" value={counts.correct} tone="correct" />
      <StatePill label="Wrong" value={counts.wrong} tone="wrong" />
      <StatePill label="Available" value={counts.available} />
      <StatePill label="Pass" value={canPass ? 'Ready' : 'Locked'} tone={canPass ? 'correct' : 'muted'} />
    </div>
  );
}
