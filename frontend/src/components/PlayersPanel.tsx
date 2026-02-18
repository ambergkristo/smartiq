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
          return (
            <li key={player} className={idx === currentPlayerIndex ? 'active' : ''}>
              <span>
                {player}
                {isOut ? ' (out)' : ''}
                {!isOut && isPassed ? ' (passed)' : ''}
              </span>
              <strong>{scores[player] ?? 0}</strong>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
