export default function WaitingRoomView({
  appTitle,
  roomCode,
  playerName,
  waitingLabel,
  savedHint,
  playersTitle,
  players,
  activeGame = null,
  noPlayersLabel,
  switchHint,
  primaryLabel,
  secondaryLabel,
  pending = false,
  onPrimary,
  onSecondary,
  style
}) {
  const revealedCount = Array.isArray(activeGame?.pegs)
    ? activeGame.pegs.filter((peg) => peg?.state === 'revealed').length
    : 0;
  const wrongCount = Array.isArray(activeGame?.pegs)
    ? activeGame.pegs.filter((peg) => peg?.state === 'wrong').length
    : 0;

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
          <strong>{activeGame?.phase === 'GAME_OVER' ? 'Game finished' : activeGame ? 'Game in progress' : waitingLabel}</strong>
        </article>
        <article>
          <span>Players joined</span>
          <strong>{players.length}</strong>
        </article>
      </div>

      {activeGame ? (
        <section className="player-waiting-room-roster" data-testid="player-lobby-active-game">
          <div className="player-waiting-room-roster-head">
            <p className="section-title">Live game</p>
            <span>{activeGame.phase === 'GAME_OVER' ? 'Finished' : `Round ${activeGame.roundNumber}`}</span>
          </div>
          <p className="field-hint">{activeGame.topic || 'Any topic'}</p>
          <p className="field-hint">{activeGame.question}</p>
          <p className="field-hint">
            Current turn: <strong>{activeGame.currentPlayerDisplayName || activeGame.currentPlayerId || 'n/a'}</strong>
          </p>
          <p className="field-hint">{activeGame.lastAction}</p>
          <p className="field-hint">
            Board state: {revealedCount} revealed | {wrongCount} wrong
          </p>
          <ul>
            {Object.entries(activeGame.playerDisplayNames || {})
              .sort((left, right) => ((activeGame.totalScores?.[right[0]] || 0) - (activeGame.totalScores?.[left[0]] || 0)))
              .map(([playerId, displayName]) => (
                <li key={playerId}>
                  <strong>{displayName || playerId}</strong>
                  <span>{activeGame.totalScores?.[playerId] || 0} pts</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

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
