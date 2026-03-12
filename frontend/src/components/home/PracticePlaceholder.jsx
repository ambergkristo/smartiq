export default function PracticePlaceholder({ onBack }) {
  return (
    <section className="practice-screen board-surface" data-testid="practice-panel">
      <p className="section-title">Solo run</p>
      <h1>Starting CherryPick solo mode</h1>
      <p className="practice-screen-copy">
        Loading the first question. If nothing appears, go back home and try launching Solo again.
      </p>
      <button type="button" className="secondary-action" onClick={onBack}>
        Back to home
      </button>
    </section>
  );
}
