import JoinButton from '../player/JoinButton';
import JoinStatusPanel from '../player/JoinStatusPanel';
import PlayerNameInput from '../player/PlayerNameInput';
import RoomCodeInput from '../player/RoomCodeInput';

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
    <section className="player-join-screen board-surface home-join-screen" data-testid="home-join-panel">
      <div className="player-join-screen-head">
        <p className="player-join-brand">SmartIQ</p>
        <span className="player-join-chip">Join game</span>
      </div>
      <div className="player-join-hero">
        <p className="section-title">Player entry</p>
        <h1>Join live room</h1>
        <p>Enter the room code and your name. Then wait for the host to start.</p>
      </div>
      <div className="player-join-form">
        <RoomCodeInput
          id="home-join-room-code"
          label="Room code"
          value={roomCode}
          placeholder="ABC123"
          disabled={pending}
          onChange={onRoomCodeChange}
        />
        <PlayerNameInput
          id="home-join-display-name"
          label="Your display name"
          value={displayName}
          placeholder="Player name"
          disabled={pending}
          onChange={onDisplayNameChange}
        />
        <JoinStatusPanel
          pending={pending}
          pendingLabel="Joining room..."
          message={message}
          error={error}
        />
        <div className="player-join-actions">
          <JoinButton label="Join room" disabled={pending} onClick={onJoin} />
          <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
            Back to home
          </button>
        </div>
      </div>
    </section>
  );
}
