import PlayerJoinFlow from '../player/PlayerJoinFlow';

export default function JoinGameScreen({
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
      brandTitle="SmartIQ"
      chipLabel="Join game"
      title="Join live room"
      roomCode={roomCode}
      roomCodeLabel="Room code"
      roomCodePlaceholder="ABC123"
      displayName={displayName}
      displayNameLabel="Your display name"
      displayNamePlaceholder="Player name"
      pending={pending}
      message={message}
      error={error}
      previewMissingLabel="Enter a room code to continue."
      introCopy="Enter the code from the host screen to move into the join flow."
      roomStepCopy="Enter the room code shown by the host."
      nameStepCopy="Enter your display name, then join the waiting room."
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
