import AnswerStateRow from './AnswerStateRow';

export default function BoardStatusBar({
  actionHint,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  optionCount,
  roundReward
}) {
  return (
    <section className="board-status-bar board-surface" data-testid="board-status-bar">
      <div className="board-status-bar-copy">
        <p className="action-hint" data-testid="action-hint">{actionHint}</p>
      </div>
      <div className="board-status-bar-row" aria-label="Round board status">
        <span className="board-status-pill">Selected {selectedIndexes.size}</span>
        <span className="board-status-pill">Revealed {revealedIndexes.size}</span>
        <span className="board-status-pill">Risk {wrongIndexes.size > 0 ? 'Broken' : 'Live'}</span>
        <span className="board-status-pill">{roundReward?.multiplierLabel || 'XP x1'}</span>
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
