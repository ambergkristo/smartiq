import {
  getRoomPlayerNames,
  getSelectedRoomPlayerNames,
  normalizePlayerName,
  normalizeRoomCodeInput
} from '../roomRuntime';
import LobbyPlayerPanel from './room/LobbyPlayerPanel';
import JoinButton from './player/JoinButton';
import JoinStatusPanel from './player/JoinStatusPanel';
import PlayerNameInput from './player/PlayerNameInput';
import RoomCodeInput from './player/RoomCodeInput';
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
          playerName={roomSession.displayName || roomSession.playerId}
          waitingLabel={strings.roomPlayerLobbyWaiting}
          savedHint={strings.roomSavedHint}
          playersTitle={strings.roomPlayerLobbyRosterTitle}
          players={roomPlayers}
          noPlayersLabel={strings.roomNoPlayers}
          switchHint={strings.roomPlayerLobbySwitchHint}
          primaryLabel={strings.roomPlayerLobbyRefreshSubmit}
          secondaryLabel={strings.roomPlayerLobbyBackHomeSubmit}
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
                <p className="section-title">Player join</p>
                <h3>Join a live room</h3>
              </div>
              <span className="player-join-chip">Simple flow</span>
            </div>
            <p>{strings.playerRouteHint}</p>
            <div className="player-join-form player-join-form--compact">
              <RoomCodeInput
                id="room-code"
                label={strings.roomCodeLabel}
                value={draft.roomCode}
                placeholder={strings.roomCodePlaceholder}
                disabled={pending}
                onChange={(event) => onDraftChange((prev) => ({ ...prev, roomCode: normalizeRoomCodeInput(event.target.value) }))}
              />
              <PlayerNameInput
                id="room-player-display-name"
                label={strings.playerRouteDisplayNameLabel}
                value={draft.displayName}
                placeholder={strings.roomDisplayNamePlaceholder}
                disabled={pending}
                onChange={(event) => onDraftChange((prev) => ({ ...prev, displayName: event.target.value }))}
              />
              <JoinStatusPanel
                pending={pending}
                pendingLabel={strings.roomPending}
                message={message}
                error={error}
              />
              <div className="player-join-actions">
                <JoinButton
                  label={strings.roomJoinSubmit}
                  disabled={pending}
                  onClick={onJoinRoom}
                />
              </div>
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
