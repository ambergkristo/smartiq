export default function PlayersPanel({
  players,
  scores,
  currentPlayerIndex,
  roundNumber,
  lastAction,
  phaseLabel,
  currentPlayer,
  targetScore,
  eliminatedPlayers,
  starterPlayer
}) {
  const outCount = players.filter((player) => eliminatedPlayers.has(player)).length;
  const activeCount = players.length - outCount;

  return (
    <aside className="players-panel board-surface">
      <h2 className="panel-title">Players</h2>
      <div className="panel-meta">
        <p className="round-line">Round {roundNumber}</p>
        <p className="round-line">Target: {targetScore} pts</p>
      </div>
      <div className="status-summary" aria-label="Round player statuses">
        <span className="player-chip active-chip">Active {activeCount}</span>
        <span className="player-chip out-chip">Out {outCount}</span>
      </div>
      <p className="round-line">
        <strong>Turn:</strong> {currentPlayer}
      </p>
      <p className="round-line">
        <strong>Starter:</strong> {starterPlayer}
      </p>
      <p className="round-line">
        <strong>Phase:</strong> {phaseLabel}
      </p>
      <p className="round-line last-action">
        <strong>Last:</strong> {lastAction}
      </p>
      <ul>
        {players.map((player, idx) => {
          const isOut = eliminatedPlayers.has(player);
          const isActive = idx === currentPlayerIndex;
          const isWaiting = !isOut && !isActive;
          const rowClass = [isActive ? 'active' : '', isOut ? 'is-out' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <li key={player} className={rowClass}>
              <span className="player-label">
                {player}
                {isActive ? <span className="player-chip active-chip">TURN</span> : null}
                {isOut ? <span className="player-chip out-chip">OUT</span> : null}
                {isWaiting ? <span className="player-chip waiting-chip">WAITING</span> : null}
              </span>
              <strong>{scores[player] ?? 0}</strong>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
