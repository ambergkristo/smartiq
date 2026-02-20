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
  return (
    <aside className="players-panel board-surface">
      <h2 className="panel-title">Players</h2>
      <div className="panel-meta">
        <p className="round-line">Round {roundNumber}</p>
        <p className="round-line">Target: {targetScore} pts</p>
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
              </span>
              <strong>{scores[player] ?? 0}</strong>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
