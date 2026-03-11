export default function WaitingRoomView({
  appTitle,
  roomCode,
  playerName,
  waitingLabel,
  savedHint,
  playersTitle,
  players,
  noPlayersLabel,
  switchHint,
  primaryLabel,
  secondaryLabel,
  pending = false,
  onPrimary,
  onSecondary,
  style
}) {
  return (
    <section className="player-waiting-room" data-testid="player-lobby-panel" style={style}>
      <div className="player-waiting-room-head">
        <p className="player-waiting-room-brand">{appTitle}</p>
        <div className="player-waiting-room-code-block">
          <span>Room code</span>
          <strong>{roomCode}</strong>
        </div>
      </div>

      <div className="player-waiting-room-hero">
        <p className="section-title">Waiting room</p>
        <h2>{playerName}</h2>
        <p>{waitingLabel}</p>
      </div>

      <div className="player-waiting-room-meta">
        <article>
          <span>Status</span>
          <strong>{waitingLabel}</strong>
        </article>
        <article>
          <span>Players</span>
          <strong>{players.length}</strong>
        </article>
      </div>

      <div className="player-waiting-room-actions">
        <button type="button" onClick={onPrimary} disabled={pending}>
          {primaryLabel}
        </button>
        <button type="button" className="secondary-action" onClick={onSecondary} disabled={pending}>
          {secondaryLabel}
        </button>
      </div>

      <section className="player-waiting-room-roster">
        <div className="player-waiting-room-roster-head">
          <p className="section-title">{playersTitle}</p>
          <span>{savedHint}</span>
        </div>
        {players.length > 0 ? (
          <ul>
            {players.map((player) => (
              <li key={player.playerId || player.displayName}>
                <strong>{player.displayName || player.playerId}</strong>
                <span>{player.playerId}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">{noPlayersLabel}</p>
        )}
      </section>

      <p className="field-hint">{switchHint}</p>
    </section>
  );
}
