export default function QrPlaceholder({ roomCode }) {
  return (
    <section className="room-qr-placeholder board-surface" data-testid="room-qr-placeholder" aria-label={`QR placeholder for room ${roomCode}`}>
      <p className="section-title">QR join</p>
      <div className="room-qr-placeholder-box" aria-hidden="true">
        <span className="room-qr-placeholder-grid" />
        <span className="room-qr-placeholder-grid room-qr-placeholder-grid--overlay" />
      </div>
      <strong>{roomCode}</strong>
      <p>Placeholder surface for QR handoff during demos and hosted runs.</p>
    </section>
  );
}
