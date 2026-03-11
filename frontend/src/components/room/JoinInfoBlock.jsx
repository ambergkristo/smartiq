export default function JoinInfoBlock({ roomCode, joinLink }) {
  return (
    <section className="room-join-info board-surface" data-testid="join-info-block">
      <p className="section-title">How players join</p>
      <h3>Open link or enter code</h3>
      <p>Players can scan the QR placeholder, open the join link, or enter code <strong>{roomCode}</strong> on the player entry screen.</p>
      <div className="room-join-link-card">
        <span>Join link</span>
        <a className="inline-link" href={joinLink}>
          {joinLink}
        </a>
      </div>
    </section>
  );
}
