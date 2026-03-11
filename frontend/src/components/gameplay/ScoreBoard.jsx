function PlayerRow({ player, score, isActive, isOut, isPassed }) {
  const rowClassName = [
    'scoreboard-player-row',
    isActive ? 'is-active' : '',
    isOut ? 'is-out' : '',
    !isOut && isPassed ? 'is-passed' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={rowClassName}>
      <div className="scoreboard-player-copy">
        <strong>{player}</strong>
        <div className="scoreboard-player-flags">
          {isActive ? <span className="player-chip active-chip">TURN</span> : null}
          {isOut ? <span className="player-chip out-chip">OUT</span> : null}
          {!isOut && isPassed ? <span className="player-chip passed-chip">PASSED</span> : null}
          {!isActive && !isOut && !isPassed ? <span className="player-chip waiting-chip">READY</span> : null}
        </div>
      </div>
      <span className="scoreboard-player-score">{score}</span>
    </li>
  );
}

export default function ScoreBoard({
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
    <aside className="scoreboard-panel board-surface" data-testid="score-board">
      <div className="scoreboard-panel-head">
        <div>
          <p className="section-title">Live scoreboard</p>
          <h2>Round {roundNumber}</h2>
        </div>
        <div className="scoreboard-target">
          <span>Target</span>
          <strong>{targetScore}</strong>
        </div>
      </div>

      <div className="scoreboard-summary">
        <span className="player-chip active-chip">Active {activeCount}</span>
        <span className="player-chip passed-chip">Passed {passedCount}</span>
        <span className="player-chip out-chip">Out {outCount}</span>
      </div>

      <div className="scoreboard-status-card">
        <p><span>Turn</span><strong>{currentPlayer}</strong></p>
        <p><span>Starter</span><strong>{starterPlayer}</strong></p>
        <p><span>Phase</span><strong>{phaseLabel}</strong></p>
        <p><span>Last</span><strong>{lastAction}</strong></p>
      </div>

      <ul className="scoreboard-player-list" aria-label="Player scoreboard">
        {players.map((player, index) => (
          <PlayerRow
            key={player}
            player={player}
            score={scores[player] ?? 0}
            isActive={index === currentPlayerIndex}
            isOut={eliminatedPlayers.has(player)}
            isPassed={passedPlayers.has(player)}
          />
        ))}
      </ul>
    </aside>
  );
}
