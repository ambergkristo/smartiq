import CherryRoundIndicator from './CherryRoundIndicator';

function resolveRoundRewardType(roundLabel) {
  const normalized = String(roundLabel || '').trim().toLowerCase();

  if (normalized.includes('golden cherry')) return 'golden-cherry';
  if (normalized.includes('double cherry')) return 'double-cherry';
  if (normalized.includes('cherry')) return 'cherry';
  return null;
}

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
  const rewardType = resolveRoundRewardType(roundLabel);
  const outcomeTone = outcome === 'success' ? 'success' : 'fail';

  return (
    <section className={`solo-round-result solo-round-result--${outcomeTone}`} data-outcome={outcomeTone} data-testid="solo-round-result">
      <div className="solo-round-result-head">
        <div>
          <p className="section-title">Round result</p>
          {rewardType ? (
            <div data-testid="solo-round-result-reward">
              <CherryRoundIndicator type={rewardType} label={roundLabel} multiplierLabel={xpMultiplierLabel} />
            </div>
          ) : (
            <strong className="solo-round-result-round-label">{roundLabel}</strong>
          )}
        </div>
        <strong className={`solo-round-result-outcome solo-round-result-outcome--${outcomeTone}`}>{resultLabel}</strong>
      </div>
      <div className="solo-round-result-grid">
        <p className="solo-round-result-metric">
          <span>Multiplier</span>
          <strong>{xpMultiplierLabel}</strong>
        </p>
        <p className="solo-round-result-metric">
          <span>Selected answers</span>
          <strong>{selectedOptions.length > 0 ? selectedOptions.join(', ') : selectedOption || 'No answer selected'}</strong>
        </p>
        <p className="solo-round-result-metric solo-round-result-metric--reward">
          <span>XP gained</span>
          <strong>{xpGained}</strong>
        </p>
        <p className="solo-round-result-metric solo-round-result-metric--emphasis">
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
