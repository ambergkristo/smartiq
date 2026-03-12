export default function HostGameScreen({ onBack }) {
  return (
    <section className="mode-shell-screen board-surface" data-testid="host-game-panel">
      <p className="home-screen-kicker">Host game</p>
      <h1>Host CherryPick</h1>
      <p className="practice-screen-copy">
        This mode will power the future live CherryPick host flow without bringing back the old SmartIQ setup path.
      </p>
      <div className="mode-shell-summary">
        <article className="mode-shell-card">
          <span>Topic packs</span>
          <strong>Starter packs coming next</strong>
        </article>
        <article className="mode-shell-card">
          <span>Join code</span>
          <strong>Generated in host mode</strong>
        </article>
        <article className="mode-shell-card">
          <span>Status</span>
          <strong>Shell ready for deeper host work</strong>
        </article>
      </div>
      <div className="mode-shell-actions">
        <button type="button" disabled>
          Host mode coming next
        </button>
        <button type="button" className="secondary-action" onClick={onBack}>
          Back to home
        </button>
      </div>
    </section>
  );
}
