export default function QuestionCard({
  question,
  categoryColor,
  isLongQuestion,
  questionExpanded,
  onToggle
}) {
  return (
    <article className="question-card board-surface" style={{ '--question-accent': categoryColor }}>
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
      <p className={`question-card-text${questionExpanded ? '' : ' is-clamped'}`} data-testid="question-card">
        {question}
      </p>
    </article>
  );
}
