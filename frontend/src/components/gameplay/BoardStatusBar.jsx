import AnswerStateRow from './AnswerStateRow';

export default function BoardStatusBar({
  actionHint,
  passNote,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  optionCount,
  canPass
}) {
  return (
    <section className="board-status-bar board-surface" data-testid="board-status-bar">
      <div className="board-status-bar-copy">
        <p className="action-hint" data-testid="action-hint">{actionHint}</p>
        <p className="pass-note">{passNote}</p>
      </div>
      <AnswerStateRow
        selectedIndexes={selectedIndexes}
        revealedIndexes={revealedIndexes}
        wrongIndexes={wrongIndexes}
        optionCount={optionCount}
        canPass={canPass}
      />
    </section>
  );
}
