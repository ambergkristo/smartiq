export default function CorrectAnswerDisplay({ title, value, detail = '', tone = 'neutral' }) {
  return (
    <section className={`correct-answer-display correct-answer-display--${tone}`} data-testid="correct-answer-display">
      <p className="correct-answer-label">{title}</p>
      <h3>{value}</h3>
      {detail ? <p className="correct-answer-detail">{detail}</p> : null}
    </section>
  );
}
