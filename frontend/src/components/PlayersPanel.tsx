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
  passedPlayers,
  starterPlayer
}) {
  const outCount = players.filter((player) => eliminatedPlayers.has(player)).length;
  const passedCount = players.filter((player) => !eliminatedPlayers.has(player) && passedPlayers.has(player)).length;
  const activeCount = players.length - outCount - passedCount;

  return (
    <aside className="players-panel board-surface">
      <h2 className="panel-title">Players</h2>
      <div className="panel-meta">
        <p className="round-line">Round {roundNumber}</p>
        <p className="round-line">Target: {targetScore} pts</p>
      </div>
      <div className="status-summary" aria-label="Round player statuses">
        <span className="player-chip active-chip">Active {activeCount}</span>
        <span className="player-chip passed-chip">Passed {passedCount}</span>
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
          const isPassed = passedPlayers.has(player);
          const isActive = idx === currentPlayerIndex;
          const isWaiting = !isOut && !isPassed && !isActive;
          const rowClass = [isActive ? 'active' : '', isOut ? 'is-out' : '', !isOut && isPassed ? 'is-passed' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <li key={player} className={rowClass}>
              <span className="player-label">
                {player}
                {isActive ? <span className="player-chip active-chip">TURN</span> : null}
                {isOut ? <span className="player-chip out-chip">OUT</span> : null}
                {!isOut && isPassed ? <span className="player-chip passed-chip">PASSED</span> : null}
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
