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
  const leadingPlayer = players.reduce((leader, player) => {
    if (!leader) {
      return player;
    }
    return (scores[player] ?? 0) > (scores[leader] ?? 0) ? player : leader;
  }, '');
  const leadingScore = leadingPlayer ? scores[leadingPlayer] ?? 0 : 0;

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
        <div className="scoreboard-turn-spotlight">
          <span>Current turn</span>
          <strong>{currentPlayer}</strong>
          <em>{phaseLabel}</em>
        </div>
        <div className="scoreboard-status-grid">
          <p><span>Starter</span><strong>{starterPlayer}</strong></p>
          <p><span>Leading</span><strong>{leadingPlayer ? `${leadingPlayer} • ${leadingScore}` : 'n/a'}</strong></p>
          <p><span>Last call</span><strong>{lastAction || 'Waiting for host action'}</strong></p>
        </div>
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
