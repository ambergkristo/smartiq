function resolvePlayerResult(player, index, currentPlayerIndex, resolutionState, eliminatedPlayers) {
  if (resolutionState?.actingPlayer === player) {
    if (resolutionState.outcome === 'correct') return 'CORRECT';
    if (resolutionState.outcome === 'success') return 'SUCCESS';
    if (resolutionState.outcome === 'fail') return 'FAIL';
    return 'LOCKED';
  }
  if (eliminatedPlayers.has(player)) return 'OUT';
  if (index === currentPlayerIndex) return 'TURN';
  return 'READY';
}

export default function PlayerResultList({
  players,
  scores,
  currentPlayerIndex,
  resolutionState,
  eliminatedPlayers
}) {
  return (
    <section className="player-result-list" data-testid="player-result-list">
      <div className="player-result-list-head">
        <p className="section-title">Player results</p>
        <strong>{resolutionState?.actingPlayer || 'Live room'}</strong>
      </div>
      <ul>
        {players.map((player, index) => {
          const result = resolvePlayerResult(
            player,
            index,
            currentPlayerIndex,
            resolutionState,
            eliminatedPlayers
          );

          return (
            <li key={player} className={`player-result-row player-result-row--${result.toLowerCase()}`}>
              <span>{player}</span>
              <div className="player-result-row-meta">
                <span className="player-result-chip">{result}</span>
                <strong>{scores[player] ?? 0}</strong>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
