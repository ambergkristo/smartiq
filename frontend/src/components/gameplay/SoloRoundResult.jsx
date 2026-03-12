export default function SoloRoundResult({
  outcome,
  selectedOption,
  selectedOptions = [],
  correctOptions = [],
  roundLabel = 'Normal',
  xpMultiplierLabel = 'XP x1',
  xpGained = 0,
  totalXp = 0
}) {
  const resultLabel = outcome === 'success' ? 'SUCCESS' : 'FAIL';

  return (
    <section className="solo-round-result" data-testid="solo-round-result">
      <div className="solo-round-result-head">
        <div>
          <p className="section-title">Round result</p>
          <strong>{roundLabel}</strong>
        </div>
        <strong>{resultLabel}</strong>
      </div>
      <div className="solo-round-result-grid">
        <p>
          <span>Multiplier</span>
          <strong>{xpMultiplierLabel}</strong>
        </p>
        <p>
          <span>Selected answers</span>
          <strong>{selectedOptions.length > 0 ? selectedOptions.join(', ') : selectedOption || 'No answer selected'}</strong>
        </p>
        <p>
          <span>XP gained</span>
          <strong>{xpGained}</strong>
        </p>
        <p>
          <span>Total XP</span>
          <strong>{totalXp}</strong>
        </p>
      </div>
      <div className="solo-round-result-correct">
        <span>Correct answers</span>
        <strong>{correctOptions.length > 0 ? correctOptions.join(', ') : 'None'}</strong>
      </div>
    </section>
  );
}
