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
      chipLabel="Join game"
      title="Join a CherryPick game"
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
      introCopy="Enter the game code to move into the CherryPick join flow."
      roomStepCopy="Enter the code shared by the host."
      nameStepCopy="Confirm your display name, then continue into the room."
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
