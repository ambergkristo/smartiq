export default function JoinInfoBlock({ roomCode, joinLink }) {
  return (
    <section className="room-join-info board-surface" data-testid="join-info-block">
      <p className="section-title">Join game</p>
      <h3>Share the code or link</h3>
      <p>Players can open the join link or enter room code <strong>{roomCode}</strong> on the CherryPick join screen.</p>
      <div className="room-join-link-card">
        <span>Join link</span>
        <a className="inline-link" href={joinLink}>
          {joinLink}
        </a>
      </div>
    </section>
  );
}
