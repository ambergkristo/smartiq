export default function ResolutionSummary({ phaseTitle, question, lastAction, tone = 'neutral' }) {
  return (
    <section className={`resolution-summary resolution-summary--${tone}`} data-testid="resolution-summary">
      <div>
        <p className="section-title">Resolution</p>
        <h3>{phaseTitle}</h3>
      </div>
      <p className="resolution-summary-question">{question}</p>
      {lastAction ? (
        <p className="resolution-summary-last">
          <span>Last call</span>
          <strong>{lastAction}</strong>
        </p>
      ) : null}
    </section>
  );
}
