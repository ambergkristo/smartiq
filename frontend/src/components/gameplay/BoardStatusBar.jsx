import AnswerStateRow from './AnswerStateRow';

export default function BoardStatusBar({
  actionHint,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  optionCount
}) {
  return (
    <section className="board-status-bar board-surface" data-testid="board-status-bar">
      <div className="board-status-bar-copy">
        <p className="action-hint" data-testid="action-hint">{actionHint}</p>
      </div>
      <AnswerStateRow
        selectedIndexes={selectedIndexes}
        revealedIndexes={revealedIndexes}
        wrongIndexes={wrongIndexes}
        optionCount={optionCount}
      />
    </section>
  );
}
