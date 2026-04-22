import CherryRoundIndicator from './CherryRoundIndicator';

export default function QuestionCard({
  question,
  roundReward,
  isLongQuestion,
  questionExpanded,
  onToggle
}) {
  return (
    <article className="question-card board-surface">
      <div className="question-card-head">
        <p className="question-card-label">Current question</p>
        {isLongQuestion ? (
          <button
            type="button"
            className="question-toggle secondary-action"
            onClick={onToggle}
          >
            {questionExpanded ? 'Show less' : 'Show more'}
          </button>
        ) : null}
      </div>
      <div className="question-card-reward-row" aria-label="Round context">
        <span className="question-meta-chip is-reward">{roundReward?.label || 'Normal round'}</span>
        <span className="question-meta-chip">{roundReward?.multiplierLabel || 'XP x1'}</span>
        <span className="question-meta-chip">One wrong pick ends the reward</span>
      </div>
      <CherryRoundIndicator
        type={roundReward?.type}
        label={roundReward?.type === 'cherry' ? 'Cherry Round' : roundReward?.badgeLabel}
        multiplierLabel={roundReward?.multiplierLabel}
      />
      <p className={`question-card-text${questionExpanded ? '' : ' is-clamped'}`} data-testid="question-card">
        {question}
      </p>
      <p className="question-card-rule">Select every correct answer. The first wrong tile ends the round immediately.</p>
    </article>
  );
}
