import {
  buildPlayerJoinUrl,
  getRoomPlayerNames,
  getSelectedRoomPlayerNames,
  normalizePlayerName,
  normalizeRoomCodeInput
} from '../roomRuntime';
import JoinInfoBlock from './room/JoinInfoBlock';
import LobbyPlayerPanel from './room/LobbyPlayerPanel';
import QrPlaceholder from './room/QrPlaceholder';
import RoomCodeHero from './room/RoomCodeHero';

export default function GameRoom({
  strings,
  appTitle,
  draft,
  pending,
  message,
  error,
  roomSession,
  selectedRoomPlayerNames,
  onDraftChange,
  onCreateRoom,
  onJoinRoom,
  onResumeRoom,
  onClearRoom,
  onSelectAllRoomPlayers,
  onToggleRoomPlayer,
  onUseRoomPlayers,
  onStartRoomSession,
  onRemoveRoomPlayer,
  onTrimRoomToSelectedPlayers
}) {
  const roomPlayers = Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players : [];
  const roomPlayerNames = getRoomPlayerNames(roomSession);
  const selectedPlayers = getSelectedRoomPlayerNames(roomSession, selectedRoomPlayerNames);
  const removableSelectedGap = roomPlayers.filter((player) => (
    roomSession?.playerId !== player.playerId
      && !selectedPlayers.includes(normalizePlayerName(player.displayName || player.playerId || ''))
  )).length;
  const isPlayerLobby = roomSession?.role === 'player';
  const roomBranding = roomSession?.roomState?.branding && typeof roomSession.roomState.branding === 'object'
    ? roomSession.roomState.branding
    : null;
  const playerLobbyAppTitle = String(roomBranding?.appName || appTitle || strings.title).trim() || strings.title;
  const playerLobbyStyle = roomBranding?.primaryColor || roomBranding?.secondaryColor
    ? {
      '--player-lobby-accent': roomBranding?.primaryColor || undefined,
      '--player-lobby-accent-2': roomBranding?.secondaryColor || roomBranding?.primaryColor || undefined
    }
    : undefined;
  const playerJoinLink = roomSession?.roomCode ? buildPlayerJoinUrl(roomSession.roomCode) : '';
  const hasLobbySession = Boolean(roomSession) && !isPlayerLobby;
  const canUseRoomPlayers = roomSession?.role === 'host' && roomPlayerNames.length > 0;

  return (
    <section className={`setup-panel board-surface room-panel${hasLobbySession ? ' room-panel--lobby' : ''}`} data-testid="room-panel">
      {!hasLobbySession ? <h2>{strings.roomPanelTitle}</h2> : null}
      {!hasLobbySession ? <p>{isPlayerLobby ? strings.roomPlayerLobbyHint : strings.roomPanelHint}</p> : null}

      {pending ? <p className="field-hint" data-testid="room-pending">{strings.roomPending}</p> : null}
      {message ? <p className="field-hint" data-testid="room-message">{message}</p> : null}
      {error ? <p className="error" data-testid="room-error">{error}</p> : null}

      {isPlayerLobby ? (
        <div className="player-lobby-card" data-testid="player-lobby-panel" style={playerLobbyStyle}>
          <div className="player-lobby-hero">
            <p className="player-lobby-brand">{playerLobbyAppTitle}</p>
            <div>
              <h3>{strings.roomPlayerLobbyTitle}</h3>
              <p>{strings.roomPlayerLobbyWaiting}</p>
            </div>
            <span className="host-plan-chip room-role-chip">
              <span>{strings.roomPlayerBadge}</span>
              <strong>{roomSession.displayName || roomSession.playerId}</strong>
            </span>
          </div>
          <div className="player-lobby-meta">
            <strong>{roomSession.roomCode}</strong>
            <span>{strings.roomSavedHint}</span>
          </div>
          <div className="room-actions">
            <button type="button" onClick={onResumeRoom} disabled={pending}>
              {strings.roomResumeSubmit}
            </button>
            <button type="button" className="secondary-action" onClick={onClearRoom} disabled={pending}>
              {strings.roomClearSubmit}
            </button>
          </div>
          <div className="room-player-list">
            <h3>{strings.roomPlayerLobbyRosterTitle}</h3>
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
              <p className="field-hint">{strings.roomNoPlayers}</p>
            )}
          </div>
          <p className="field-hint">{strings.roomPlayerLobbySwitchHint}</p>
        </div>
      ) : hasLobbySession ? (
        <>
          <div className="room-lobby-overview">
            <RoomCodeHero
              roomCode={roomSession.roomCode}
              connectedCount={roomPlayers.length}
              readyCount={selectedPlayers.length}
              hostLabel={roomSession.displayName || roomSession.playerId}
            />
            <div className="room-lobby-side-stack">
              <JoinInfoBlock roomCode={roomSession.roomCode} joinLink={playerJoinLink} />
              <QrPlaceholder roomCode={roomSession.roomCode} />
            </div>
          </div>
          <div data-testid="room-session-card">
            <LobbyPlayerPanel
              strings={strings}
              roomPlayers={roomPlayers}
              roomSession={roomSession}
              pending={pending}
              selectedPlayers={selectedPlayers}
              removableSelectedGap={removableSelectedGap}
              onSelectAllRoomPlayers={onSelectAllRoomPlayers}
              onUseRoomPlayers={onUseRoomPlayers}
              onTrimRoomToSelectedPlayers={onTrimRoomToSelectedPlayers}
              onToggleRoomPlayer={onToggleRoomPlayer}
              onRemoveRoomPlayer={onRemoveRoomPlayer}
            />
          </div>
        </>
      ) : (
        <div className="room-entry-grid">
          <section className="room-entry-card">
            <p className="section-title">Create host lobby</p>
            <h3>Launch a new room</h3>
            <p>{strings.roomPanelHint}</p>
            <label htmlFor="room-display-name">{strings.roomDisplayNameLabel}</label>
            <input
              id="room-display-name"
              type="text"
              value={draft.displayName}
              onChange={(event) => onDraftChange((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder={strings.roomDisplayNamePlaceholder}
              autoComplete="nickname"
              disabled={pending}
            />
            <div className="room-actions">
              <button type="button" onClick={onCreateRoom} disabled={pending}>
                {strings.roomCreateSubmit}
              </button>
            </div>
          </section>
          <section className="room-entry-card room-entry-card--secondary">
            <p className="section-title">Resume existing lobby</p>
            <h3>Join with a code</h3>
            <p>Use this only when you need to reattach this browser to an existing room.</p>
            <label htmlFor="room-code">{strings.roomCodeLabel}</label>
            <input
              id="room-code"
              type="text"
              value={draft.roomCode}
              onChange={(event) => onDraftChange((prev) => ({ ...prev, roomCode: normalizeRoomCodeInput(event.target.value) }))}
              placeholder={strings.roomCodePlaceholder}
              autoComplete="off"
              disabled={pending}
            />
            <div className="room-actions">
              <button type="button" className="secondary-action" onClick={onJoinRoom} disabled={pending}>
                {strings.roomJoinSubmit}
              </button>
            </div>
          </section>
        </div>
      )}

      {hasLobbySession && canUseRoomPlayers && typeof onStartRoomSession === 'function' ? (
        <span className="sr-only" aria-live="polite">
          {strings.roomStartSelectedLiveSubmit}
        </span>
      ) : null}
    </section>
  );
}
