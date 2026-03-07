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
    <section className="setup-panel board-surface player-route-panel" data-testid="player-route-panel" style={previewStyle}>
      <p className="player-lobby-brand">{previewTitle}</p>
      <h1>{strings.playerRouteTitle}</h1>
      <p>{strings.playerRouteHint}</p>
      <p className="field-hint">
        {strings.roomCodeLabel}: <strong>{roomCode}</strong>
      </p>
      {pending ? <p className="field-hint">{strings.playerRouteLoading}</p> : null}
      {message ? <p className="field-hint" data-testid="player-route-message">{message}</p> : null}
      {error ? <p className="error" data-testid="player-route-error">{error}</p> : null}
      <label htmlFor="player-route-display-name">{strings.playerRouteDisplayNameLabel}</label>
      <input
        id="player-route-display-name"
        type="text"
        value={displayName}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        placeholder={strings.roomDisplayNamePlaceholder}
        autoComplete="nickname"
        disabled={pending}
      />
      <div className="room-actions">
        <button type="button" onClick={onJoin} disabled={pending}>
          {strings.playerRouteJoinSubmit}
        </button>
        <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
          {strings.playerRouteBackSubmit}
        </button>
      </div>
      {preview ? (
        <div className="player-route-preview" data-testid="player-route-preview">
          <p className="field-hint">
            {strings.playerRoutePreviewPlayersPrefix} {previewPlayers.length}
          </p>
          {previewPlayers.length > 0 ? (
            <ul className="recent-session-scoreboard">
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
