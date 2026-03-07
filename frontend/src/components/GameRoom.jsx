import {
  buildPlayerJoinUrl,
  getRoomPlayerNames,
  getSelectedRoomPlayerNames,
  normalizePlayerName,
  normalizeRoomCodeInput
} from '../roomRuntime';

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
  const canUseRoomPlayers = roomSession?.role === 'host' && roomPlayerNames.length > 0;
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

  return (
    <section className="setup-panel board-surface room-panel" data-testid="room-panel">
      <h2>{strings.roomPanelTitle}</h2>
      <p>{isPlayerLobby ? strings.roomPlayerLobbyHint : strings.roomPanelHint}</p>

      {pending ? <p className="field-hint">{strings.roomPending}</p> : null}
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
      ) : (
        <>
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
            <button type="button" onClick={onCreateRoom} disabled={pending}>
              {strings.roomCreateSubmit}
            </button>
            <button type="button" onClick={onJoinRoom} disabled={pending}>
              {strings.roomJoinSubmit}
            </button>
            {roomSession ? (
              <>
                <button type="button" onClick={onResumeRoom} disabled={pending}>
                  {strings.roomResumeSubmit}
                </button>
                <button type="button" className="secondary-action" onClick={onClearRoom} disabled={pending}>
                  {strings.roomClearSubmit}
                </button>
              </>
            ) : null}
          </div>
        </>
      )}

      {roomSession && !isPlayerLobby ? (
        <div className="room-session-card" data-testid="room-session-card">
          <div className="room-session-header">
            <div>
              <strong>{roomSession.roomCode}</strong>
              <span className="field-hint">{strings.roomSavedHint}</span>
            </div>
            <span className="host-plan-chip room-role-chip">
              <span>{roomSession.role === 'host' ? strings.roomHostBadge : strings.roomPlayerBadge}</span>
              <strong>{roomSession.displayName || roomSession.playerId}</strong>
            </span>
          </div>
          <div className="room-player-list">
            <h3>{strings.roomPlayersTitle}</h3>
            {roomSession?.role === 'host' && playerJoinLink ? (
              <p className="field-hint">
                {strings.roomJoinLinkLabel}:{' '}
                <a className="inline-link" href={playerJoinLink}>
                  {playerJoinLink}
                </a>
              </p>
            ) : null}
            {canUseRoomPlayers ? (
              <>
                <div className="room-actions">
                  <button type="button" onClick={onSelectAllRoomPlayers} disabled={pending}>
                    {strings.roomSelectAllPlayersSubmit}
                  </button>
                  <button type="button" onClick={onUseRoomPlayers} disabled={pending || selectedPlayers.length === 0}>
                    {strings.roomUseSelectedPlayersSubmit}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={onTrimRoomToSelectedPlayers}
                    disabled={pending || selectedPlayers.length === 0 || removableSelectedGap === 0}
                  >
                    {strings.roomTrimSelectedPlayersSubmit}
                  </button>
                  <button type="button" onClick={onStartRoomSession} disabled={pending || selectedPlayers.length === 0}>
                    {strings.roomStartSelectedLiveSubmit}
                  </button>
                </div>
                <p className="field-hint" data-testid="room-selected-roster-hint">
                  {strings.roomSelectedRosterTitle}: {selectedPlayers.length > 0 ? selectedPlayers.join(', ') : strings.roomSelectedRosterEmpty}
                </p>
              </>
            ) : null}
            {roomPlayers.length > 0 ? (
              <ul>
                {roomPlayers.map((player) => (
                  <li key={player.playerId || player.displayName}>
                    <strong>{player.displayName || player.playerId}</strong>
                    <span>{player.playerId}</span>
                    {canUseRoomPlayers ? (
                      <div className="room-player-row-actions">
                        <label className="room-player-toggle">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.includes(normalizePlayerName(player.displayName || player.playerId || ''))}
                            onChange={() => onToggleRoomPlayer(normalizePlayerName(player.displayName || player.playerId || ''))}
                          />
                          <span>Include in launch</span>
                        </label>
                        {roomSession?.playerId !== player.playerId ? (
                          <button
                            type="button"
                            className="secondary-action room-player-remove-action"
                            onClick={() => onRemoveRoomPlayer(player)}
                            disabled={pending}
                          >
                            {strings.roomRemovePlayerSubmit}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-hint">{strings.roomNoPlayers}</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
