import JoinButton from './player/JoinButton';
import JoinStatusPanel from './player/JoinStatusPanel';
import PlayerNameInput from './player/PlayerNameInput';
import RoomCodeInput from './player/RoomCodeInput';

export default function PlayerJoin({
  strings,
  roomCode,
  appTitle,
  preview,
  pending,
  message,
  error,
  displayName,
  onDisplayNameChange,
  onJoin,
  onBack
}) {
  const previewBranding = preview?.branding && typeof preview.branding === 'object' ? preview.branding : null;
  const previewPlayers = Array.isArray(preview?.players) ? preview.players : [];
  const previewTitle = String(previewBranding?.appName || appTitle || strings.title).trim() || strings.title;
  const previewStyle = previewBranding?.primaryColor || previewBranding?.secondaryColor
    ? {
      '--player-lobby-accent': previewBranding?.primaryColor || undefined,
      '--player-lobby-accent-2': previewBranding?.secondaryColor || previewBranding?.primaryColor || undefined
    }
    : undefined;

  return (
    <section className="player-join-screen board-surface" data-testid="player-route-panel" style={previewStyle}>
      <div className="player-join-screen-head">
        <p className="player-join-brand">{previewTitle}</p>
        <span className="player-join-chip">Live join</span>
      </div>
      <div className="player-join-hero">
        <p className="section-title">Player join</p>
        <h1>{strings.playerRouteTitle}</h1>
        <div className="player-join-code-callout">
          <span>{strings.roomCodeLabel}</span>
          <strong>{roomCode}</strong>
        </div>
        <p>{strings.playerRouteHint}</p>
      </div>
      <div className="player-join-form">
        <RoomCodeInput
          id="player-route-room-code"
          label={strings.roomCodeLabel}
          value={roomCode}
          placeholder={strings.roomCodePlaceholder}
          readOnly
          disabled={pending}
        />
        <PlayerNameInput
          id="player-route-display-name"
          label={strings.playerRouteDisplayNameLabel}
          value={displayName}
          placeholder={strings.roomDisplayNamePlaceholder}
          disabled={pending}
          onChange={(event) => onDisplayNameChange(event.target.value)}
        />
        <JoinStatusPanel
          pending={pending}
          pendingLabel={strings.playerRouteLoading}
          message={message}
          error={error}
        />
        <div className="player-join-actions">
          <JoinButton
            label={strings.playerRouteJoinSubmit}
            disabled={pending}
            onClick={onJoin}
          />
          <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
            {strings.playerRouteBackSubmit}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="player-route-preview" data-testid="player-route-preview">
          <div className="player-route-preview-head">
            <p className="section-title">Waiting room</p>
            <strong>{`${previewPlayers.length}`}</strong>
          </div>
          <p className="field-hint">
            {strings.playerRoutePreviewPlayersPrefix} {previewPlayers.length}
          </p>
          {previewPlayers.length > 0 ? (
            <ul className="player-route-preview-list">
              {previewPlayers.map((player) => (
                <li key={player.playerId || player.displayName}>
                  <strong>{player.displayName || player.playerId}</strong>
                  <span>{player.playerId}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">{strings.playerRoutePreviewMissing}</p>
          )}
        </div>
      ) : (
        <p className="field-hint">{strings.playerRoutePreviewMissing}</p>
      )}
    </section>
  );
}
