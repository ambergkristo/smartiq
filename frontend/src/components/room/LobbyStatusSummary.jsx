export default function LobbyStatusSummary({
  roomCode,
  topicLabel,
  languageLabel,
  connectedCount,
  readyCount,
  hostName,
  hostLaunchBlocked,
  hostLaunchMessage,
  pending,
  onResumeRoom,
  onClearRoom
}) {
  return (
    <section className="setup-panel board-surface lobby-status-summary" data-testid="lobby-status-summary">
      <div className="lobby-status-summary-head">
        <div>
          <p className="section-title">Launch status</p>
          <h2>Room ready</h2>
        </div>
        <div className="host-plan-chip">
          <span>Host</span>
          <strong>{hostName}</strong>
        </div>
      </div>

      <div className="lobby-status-summary-grid">
        <article className="lobby-status-metric">
          <span>Room</span>
          <strong>{roomCode}</strong>
        </article>
        <article className="lobby-status-metric">
          <span>Connected</span>
          <strong>{connectedCount}</strong>
        </article>
        <article className="lobby-status-metric">
          <span>Ready</span>
          <strong>{readyCount}</strong>
        </article>
        <article className="lobby-status-metric">
          <span>Language</span>
          <strong>{languageLabel}</strong>
        </article>
        <article className="lobby-status-metric">
          <span>Topic</span>
          <strong>{topicLabel}</strong>
        </article>
      </div>

      <p className="field-hint" data-testid="active-filter">
        Active filter: {topicLabel} | {languageLabel}
      </p>

      <div className="lobby-status-summary-copy">
        <p>Players are collected in the room first. The launch action starts the game with the selected roster only.</p>
        {hostLaunchBlocked ? <p className="error">{hostLaunchMessage}</p> : null}
      </div>

      <div className="lobby-status-summary-actions">
        <button type="button" className="secondary-action" onClick={onResumeRoom} disabled={pending}>
          Resume room
        </button>
        <button type="button" className="secondary-action" onClick={onClearRoom} disabled={pending}>
          Exit lobby
        </button>
      </div>
    </section>
  );
}
