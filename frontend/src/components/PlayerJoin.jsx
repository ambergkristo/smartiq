import PlayerJoinFlow from './player/PlayerJoinFlow';

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
  const previewTitle = String(previewBranding?.appName || appTitle || strings.title).trim() || strings.title;
  const previewStyle = previewBranding?.primaryColor || previewBranding?.secondaryColor
    ? {
      '--player-lobby-accent': previewBranding?.primaryColor || undefined,
      '--player-lobby-accent-2': previewBranding?.secondaryColor || previewBranding?.primaryColor || undefined
    }
    : undefined;

  return (
    <div style={previewStyle}>
      <PlayerJoinFlow
        screenTestId="player-route-panel"
        brandTitle={previewTitle}
        chipLabel="Join live room"
        title={strings.playerRouteTitle}
        roomCode={roomCode}
        roomCodeLabel={strings.roomCodeLabel}
        roomCodePlaceholder={strings.roomCodePlaceholder}
        roomCodeReadOnly
        displayName={displayName}
        displayNameLabel={strings.playerRouteDisplayNameLabel}
        displayNamePlaceholder={strings.roomDisplayNamePlaceholder}
        pending={pending}
        message={message}
        error={error}
        preview={preview}
        previewMissingLabel={strings.playerRoutePreviewMissing}
        introCopy={strings.playerRouteHint}
        roomStepCopy="Confirm the room code, then continue into the live room check-in."
        nameStepCopy="Enter the display name that should appear in the host's live roster."
        statusPendingLabel={strings.playerRouteLoading}
        nextLabel="Next"
        joinLabel={strings.playerRouteJoinSubmit}
        backLabel={strings.playerRouteBackSubmit}
        onDisplayNameChange={onDisplayNameChange}
        onJoin={onJoin}
        onBack={onBack}
      />
    </div>
  );
}
