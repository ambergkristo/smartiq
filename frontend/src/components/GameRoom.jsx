import {
  getRoomLifecycle,
  getRoomPlayerNames,
  getSelectedRoomPlayerNames,
  isRoomJoinable,
  normalizePlayerName
} from '../roomRuntime';
import LobbyPlayerPanel from './room/LobbyPlayerPanel';
import WaitingRoomView from './player/WaitingRoomView';
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
  onToggleRoomPlayer,
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
  const hasLobbySession = Boolean(roomSession) && !isPlayerLobby;
  const canUseRoomPlayers = roomSession?.role === 'host' && roomPlayerNames.length > 0;
  const roomLifecycle = getRoomLifecycle(roomSession);
  const roomJoinable = isRoomJoinable(roomSession);
  const playerWaitingLabel = roomJoinable
    ? strings.roomPlayerLobbyWaiting
    : strings.roomPlayerLobbyLive;
  const playerPhaseLabel = roomJoinable ? 'Waiting' : 'Live';
  const playerPrimaryLabel = roomJoinable
    ? strings.roomPlayerLobbyRefreshSubmit
    : strings.roomPlayerLobbyLiveRefreshSubmit;

  return (
    <section className={`setup-panel board-surface room-panel${hasLobbySession ? ' room-panel--lobby' : ''}`} data-testid="room-panel">
      {!hasLobbySession ? <h2>{strings.roomPanelTitle}</h2> : null}
      {!hasLobbySession ? <p>{isPlayerLobby ? strings.roomPlayerLobbyHint : strings.roomPanelHint}</p> : null}

      {pending ? <p className="field-hint" data-testid="room-pending">{strings.roomPending}</p> : null}
      {message ? <p className="field-hint" data-testid="room-message">{message}</p> : null}
      {error ? <p className="error" data-testid="room-error">{error}</p> : null}

      {isPlayerLobby ? (
        <WaitingRoomView
          appTitle={playerLobbyAppTitle}
          roomCode={roomSession.roomCode}
          hostPlayerId={roomSession?.roomState?.hostPlayerId}
          playerName={roomSession.displayName || 'Player'}
          waitingLabel={playerWaitingLabel}
          phaseLabel={playerPhaseLabel}
          savedHint={strings.roomSavedHint}
          playersTitle={strings.roomPlayerLobbyRosterTitle}
          players={roomPlayers}
          noPlayersLabel={strings.roomNoPlayers}
          switchHint={strings.roomPlayerLobbySwitchHint}
          primaryLabel={playerPrimaryLabel}
          secondaryLabel={strings.roomPlayerLobbyLeaveSubmit}
          pending={pending}
          onPrimary={onResumeRoom}
          onSecondary={onClearRoom}
          style={playerLobbyStyle}
        />
      ) : hasLobbySession ? (
        <div className="room-lobby-main">
          <div className="room-lobby-overview">
            <RoomCodeHero
              roomCode={roomSession.roomCode}
              joinedCount={roomPlayers.length}
            />
          </div>
          <div data-testid="room-session-card">
            <LobbyPlayerPanel
              strings={strings}
              roomPlayers={roomPlayers}
              roomSession={roomSession}
              pending={pending}
              selectedPlayers={selectedPlayers}
              removableSelectedGap={removableSelectedGap}
              onTrimRoomToSelectedPlayers={onTrimRoomToSelectedPlayers}
              onToggleRoomPlayer={onToggleRoomPlayer}
              onRemoveRoomPlayer={onRemoveRoomPlayer}
            />
          </div>
        </div>
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
            <div className="player-join-card-head">
              <div>
                <p className="section-title">Canonical flow</p>
                <h3>Player join stays on the public join screen</h3>
              </div>
              <span className="player-join-chip">Host only</span>
            </div>
            <p>CherryPick now keeps one public join path: players enter a room code from the dedicated JOIN screen or a host share link.</p>
            <p className="field-hint">Create the host lobby here, then share the room code once it is ready.</p>
          </section>
        </div>
      )}

      {hasLobbySession && canUseRoomPlayers && typeof onStartRoomSession === 'function' ? (
        <span className="sr-only" aria-live="polite">
          {roomLifecycle === 'LIVE' ? strings.roomAlreadyLive : strings.roomStartSelectedLiveSubmit}
        </span>
      ) : null}
    </section>
  );
}
