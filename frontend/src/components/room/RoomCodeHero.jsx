export default function RoomCodeHero({ roomCode, connectedCount, readyCount, hostLabel }) {
  return (
    <section className="room-code-hero board-surface" data-testid="room-code-hero">
      <div className="room-code-hero-head">
        <p className="section-title">Room code</p>
        <span className="host-plan-chip room-role-chip room-role-chip--hero">
          <span>Host</span>
          <strong>{hostLabel}</strong>
        </span>
      </div>
      <div className="room-code-hero-code" aria-label={`Room code ${roomCode}`}>
        {roomCode}
      </div>
      <p className="room-code-hero-copy">Share this code before the round starts. Players only need the code or the join link.</p>
      <div className="room-code-hero-metrics" aria-label="Lobby status summary">
        <article>
          <span>Connected</span>
          <strong>{connectedCount}</strong>
        </article>
        <article>
          <span>Ready</span>
          <strong>{readyCount}</strong>
        </article>
      </div>
    </section>
  );
}
