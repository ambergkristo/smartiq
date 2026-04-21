import CherryPickLogo, { isCherryPickBrand } from '../branding/CherryPickLogo';
import { getRoomLifecycle } from '../../roomRuntime';

export default function HostGameScreen({
  appTitle = 'CherryPick',
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
  const roomLifecycle = getRoomLifecycle(roomSession);
  const sessionStatus = hasRoom
    ? roomLifecycle === 'LIVE'
      ? 'Game launched. New joins are now closed.'
      : roomPlayers.length > 1
        ? 'Players joined. Ready to start.'
        : 'Room live. Waiting for players.'
    : 'Choose a topic and create a host room.';
  const topicSummary = selectedTopic || 'Choose topic';
  const hostNameSummary = String(hostName || '').trim() || 'Host';

  return (
    <section className="mode-shell-screen board-surface host-mode-screen" data-state={hasRoom ? 'ready' : 'setup'} data-testid="host-game-panel">
      <div className="host-mode-brand-block">
        <p className="home-screen-kicker">Host game</p>
        <h1 className={isCherryPickBrand(appTitle) ? 'host-mode-brand-heading' : ''}>
          {isCherryPickBrand(appTitle) ? <CherryPickLogo size="hero" /> : `Host ${appTitle}`}
        </h1>
        <p className="practice-screen-copy">
          Create a live room, share the code, and launch the board once players are ready.
        </p>
      </div>

      <div className="host-mode-layout">
        <div className="host-mode-main">
          <div className="host-mode-intro-card">
            <p className="section-title">Host setup</p>
            <strong>{hasRoom ? 'Room is ready to launch' : 'Prepare the next room'}</strong>
            <p>{hasRoom ? sessionStatus : 'Choose the topic, confirm the host name, and create the room when everything looks right.'}</p>
          </div>

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
                      <strong>{player.displayName || 'Player'}</strong>
                      <span>{player.playerId === roomSession?.playerId ? 'Host' : 'Joined player'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-hint">No players joined yet.</p>
              )}
            </section>
          ) : null}
        </div>

        <aside className="host-mode-side-panel">
          <div className="host-mode-side-card">
            <p className="section-title">Room preview</p>
            <div className="host-mode-side-metrics">
              <article>
                <span>Topic</span>
                <strong>{topicSummary}</strong>
              </article>
              <article>
                <span>Host</span>
                <strong>{hostNameSummary}</strong>
              </article>
              <article>
                <span>{hasRoom ? 'Players' : 'Status'}</span>
                <strong>{hasRoom ? roomPlayers.length : 'Setup'}</strong>
              </article>
            </div>
            <p className="field-hint host-mode-side-note">
              {hasRoom
                ? 'Share the code, watch the roster, then start once the room is ready.'
                : 'This setup stays focused: one topic, one host name, one room launch path.'}
            </p>
          </div>
        </aside>
      </div>

      <div className="mode-shell-actions host-mode-actions">
        {hasRoom ? (
          <button type="button" className="host-mode-primary-button" onClick={onStartGame} disabled={pending || roomLifecycle === 'LIVE'}>
            {roomLifecycle === 'LIVE' ? 'Game live' : 'Start game'}
          </button>
        ) : (
          <button type="button" className="host-mode-primary-button" onClick={onCreateRoom} disabled={pending}>
            Create room
          </button>
        )}
        <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
          {hasRoom ? 'Leave host room' : 'Back to home'}
        </button>
      </div>
    </section>
  );
}
