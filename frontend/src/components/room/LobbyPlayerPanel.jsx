import { normalizePlayerName } from '../../roomRuntime';

export default function LobbyPlayerPanel({
  strings,
  roomPlayers,
  roomSession,
  pending,
  selectedPlayers,
  removableSelectedGap,
  onSelectAllRoomPlayers,
  onUseRoomPlayers,
  onTrimRoomToSelectedPlayers,
  onToggleRoomPlayer,
  onRemoveRoomPlayer
}) {
  const canUseRoomPlayers = roomSession?.role === 'host' && roomPlayers.length > 0;

  return (
    <section className="lobby-player-panel board-surface" data-testid="lobby-player-panel">
      <div className="lobby-player-panel-head">
        <div>
          <p className="section-title">{strings.roomPlayersTitle}</p>
          <h3>Connected roster</h3>
        </div>
        {canUseRoomPlayers ? (
          <div className="lobby-player-panel-actions">
            <button type="button" className="secondary-action" onClick={onSelectAllRoomPlayers} disabled={pending}>
              {strings.roomSelectAllPlayersSubmit}
            </button>
            <button type="button" className="secondary-action" onClick={onUseRoomPlayers} disabled={pending || selectedPlayers.length === 0}>
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
          </div>
        ) : null}
      </div>
      <p className="field-hint room-selected-roster-hint" data-testid="room-selected-roster-hint">
        {strings.roomSelectedRosterTitle}: {selectedPlayers.length > 0 ? selectedPlayers.join(', ') : strings.roomSelectedRosterEmpty}
      </p>
      {roomPlayers.length > 0 ? (
        <ul className="lobby-player-list">
          {roomPlayers.map((player) => {
            const playerName = normalizePlayerName(player.displayName || player.playerId || '');
            const selected = selectedPlayers.includes(playerName);
            const removable = roomSession?.playerId !== player.playerId;

            return (
              <li key={player.playerId || player.displayName} className={selected ? 'is-selected' : ''}>
                <label className="lobby-player-toggle">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleRoomPlayer(playerName)}
                  />
                  <span className="sr-only">Include in launch</span>
                  <span className="lobby-player-meta">
                    <strong>{player.displayName || player.playerId}</strong>
                    <small>{selected ? 'Ready to launch' : 'Not in launch roster'}</small>
                  </span>
                </label>
                <div className="lobby-player-actions">
                  <span className={`lobby-player-state${selected ? ' is-selected' : ''}`}>
                    {selected ? 'Ready' : 'Standby'}
                  </span>
                  {removable ? (
                    <button
                      type="button"
                      className="secondary-action room-player-remove-action"
                      onClick={() => onRemoveRoomPlayer(player)}
                      disabled={pending}
                    >
                      {strings.roomRemovePlayerSubmit}
                    </button>
                  ) : (
                    <span className="lobby-player-host-badge">Host</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="field-hint">{strings.roomNoPlayers}</p>
      )}
    </section>
  );
}
