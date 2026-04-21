import PlayerJoinFlow from '../player/PlayerJoinFlow';

export default function JoinGameScreen({
  appTitle,
  roomCode,
  displayName,
  pending,
  message,
  error,
  onRoomCodeChange,
  onDisplayNameChange,
  onJoin,
  onBack
}) {
  return (
    <PlayerJoinFlow
      screenTestId="home-join-panel"
      brandTitle={appTitle}
      chipLabel="Join live room"
      title="Join a CherryPick live room"
      roomCode={roomCode}
      roomCodeLabel="Game code"
      roomCodePlaceholder="ABC123"
      displayName={displayName}
      displayNameLabel="Your display name"
      displayNamePlaceholder="Player name"
      pending={pending}
      message={message}
      error={error}
      previewMissingLabel="Enter a room code to continue."
      introCopy="Enter the host's code to follow a live CherryPick session from your device."
      roomStepCopy="Enter the code shared by the host to open the room roster."
      nameStepCopy="Choose the display name that will appear in the host's live roster."
      statusPendingLabel="Joining room..."
      nextLabel="Next"
      joinLabel="Join game"
      backLabel="Back to home"
      onRoomCodeChange={onRoomCodeChange}
      onDisplayNameChange={onDisplayNameChange}
      onJoin={onJoin}
      onBack={onBack}
    />
  );
}
