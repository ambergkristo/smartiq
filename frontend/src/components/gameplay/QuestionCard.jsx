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
      <CherryRoundIndicator
        type={roundReward?.type}
        label={roundReward?.type === 'cherry' ? 'Cherry Round' : roundReward?.badgeLabel}
        multiplierLabel={roundReward?.multiplierLabel}
      />
      <p className={`question-card-text${questionExpanded ? '' : ' is-clamped'}`} data-testid="question-card">
        {question}
      </p>
    </article>
  );
}
