export default function JoinStatusPanel({ pending, pendingLabel, message, error }) {
  if (!pending && !message && !error) {
    return null;
  }

  return (
    <section className="player-join-status-panel" data-testid="player-join-status-panel">
      {pending ? <p className="player-join-status-line">{pendingLabel}</p> : null}
      {message ? <p className="player-join-status-line" data-testid="player-route-message">{message}</p> : null}
      {error ? <p className="error" data-testid="player-route-error">{error}</p> : null}
    </section>
  );
}
