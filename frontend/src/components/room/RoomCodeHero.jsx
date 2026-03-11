export default function RoomCodeHero({ roomCode, joinedCount }) {
  return (
    <section className="room-code-hero board-surface" data-testid="room-code-hero">
      <div className="room-code-hero-head">
        <p className="section-title">Room code</p>
      </div>
      <div className="room-code-hero-code" aria-label={`Room code ${roomCode}`}>
        {roomCode}
      </div>
      <p className="room-code-hero-copy">Share this code with players. They can join instantly and wait for the host to start the game.</p>
      <div className="room-code-hero-status" aria-label="Lobby status summary">
        <span>Players joined</span>
        <strong>{joinedCount}</strong>
      </div>
    </section>
  );
}
