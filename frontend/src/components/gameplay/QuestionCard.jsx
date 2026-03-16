export default function QuestionCard({
  question,
  roundIndicator,
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
      {roundIndicator ? (
        <p className="question-card-round-indicator" data-testid="question-card-round-indicator">
          {roundIndicator}
        </p>
      ) : null}
      <p className={`question-card-text${questionExpanded ? '' : ' is-clamped'}`} data-testid="question-card">
        {question}
      </p>
    </article>
  );
}
