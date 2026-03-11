export default function PracticePlaceholder({ onBack }) {
  return (
    <section className="practice-screen board-surface" data-testid="practice-panel">
      <p className="section-title">Practice</p>
      <h1>Single-player practice</h1>
      <p className="practice-screen-copy">
        Practice mode is parked for the next milestone. This screen is a placeholder route only.
      </p>
      <button type="button" className="secondary-action" onClick={onBack}>
        Back to home
      </button>
    </section>
  );
}
