export default function HostGameScreen({
  topics = [],
  selectedTopic = '',
  hostName = '',
  roomSession = null,
  pending = false,
  message = '',
  error = '',
  onTopicChange,
  onHostNameChange,
  onCreateRoom,
  onStartGame,
  onBack
}) {
  const roomPlayers = Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players : [];
  const hasRoom = roomSession?.role === 'host' && Boolean(roomSession?.roomCode);
  const sessionStatus = hasRoom
    ? roomPlayers.length > 1
      ? 'Players joined. Ready to start.'
      : 'Room live. Waiting for players.'
    : 'Choose a topic and create a host room.';

  return (
    <section className="mode-shell-screen board-surface host-mode-screen" data-testid="host-game-panel">
      <p className="home-screen-kicker">Host game</p>
      <h1>Host CherryPick</h1>
      <p className="practice-screen-copy">
        Create a minimal live room, share the code, and start the game once players are in.
      </p>

      {!hasRoom ? (
        <div className="host-mode-form">
          <label className="host-mode-field" htmlFor="host-topic-select">
            <span>Topic</span>
            <select
              id="host-topic-select"
              value={selectedTopic}
              onChange={(event) => onTopicChange?.(event.target.value)}
              disabled={pending}
            >
              <option value="">Choose topic</option>
              {topics.map((topic) => (
                <option key={topic.topic} value={topic.topic}>
                  {topic.topic}
                </option>
              ))}
            </select>
          </label>

          <label className="host-mode-field" htmlFor="host-display-name">
            <span>Host name</span>
            <input
              id="host-display-name"
              type="text"
              value={hostName}
              onChange={(event) => onHostNameChange?.(event.target.value)}
              placeholder="Host"
              autoComplete="nickname"
              disabled={pending}
            />
          </label>
        </div>
      ) : (
        <div className="mode-shell-summary host-mode-summary">
          <article className="mode-shell-card">
            <span>Topic</span>
            <strong data-testid="host-topic-display">{selectedTopic || 'No topic selected'}</strong>
          </article>
          <article className="mode-shell-card">
            <span>Join code</span>
            <strong data-testid="host-room-code">{roomSession.roomCode}</strong>
          </article>
          <article className="mode-shell-card">
            <span>Status</span>
            <strong>{sessionStatus}</strong>
          </article>
        </div>
      )}

      {message ? <p className="field-hint" data-testid="host-game-message">{message}</p> : null}
      {error ? <p className="error" data-testid="host-game-error">{error}</p> : null}

      {hasRoom ? (
        <section className="host-mode-roster" data-testid="host-player-list">
          <div className="host-mode-roster-head">
            <p className="section-title">Players</p>
            <strong>{roomPlayers.length}</strong>
          </div>
          {roomPlayers.length > 0 ? (
            <ul>
              {roomPlayers.map((player) => (
                <li key={player.playerId || player.displayName}>
                  <strong>{player.displayName || player.playerId}</strong>
                  <span>{player.playerId}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">No players joined yet.</p>
          )}
        </section>
      ) : null}

      <div className="mode-shell-actions">
        {hasRoom ? (
          <button type="button" onClick={onStartGame} disabled={pending}>
            Start game
          </button>
        ) : (
          <button type="button" onClick={onCreateRoom} disabled={pending}>
            Create room
          </button>
        )}
        <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
          Back to home
        </button>
      </div>
    </section>
  );
}
