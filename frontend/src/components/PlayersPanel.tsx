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
  passedPlayers
}) {
  return (
    <aside className="players-panel board-surface">
      <h2>Players</h2>
      <p className="round-line">Round {roundNumber}</p>
      <p className="round-line">Turn: {currentPlayer}</p>
      <p className="round-line">Phase: {phaseLabel}</p>
      <p className="round-line">Target: {targetScore} points</p>
      <p className="round-line">Last action: {lastAction}</p>
      <ul>
        {players.map((player, idx) => {
          const isOut = eliminatedPlayers.has(player);
          const isPassed = passedPlayers.has(player);
          const isActive = idx === currentPlayerIndex;
          return (
            <li key={player} className={isActive ? 'active' : ''}>
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
