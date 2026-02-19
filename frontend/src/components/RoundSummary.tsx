export default function RoundSummary({ players, scores, stats = {}, roundNumber, onNextRound, onRestart, onPlayAgain, winner }) {
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  return (
    <section className="board-surface round-summary">
      <h1>{winner ? 'Game Summary' : 'Round Summary'}</h1>
      <p>{winner ? `${winner} reached 30 points.` : `Round ${roundNumber} complete.`}</p>
      <div className="summary-table" role="table" aria-label="Game summary">
        <div className="summary-head" role="row">
          <span role="columnheader">Player</span>
          <span role="columnheader">Score</span>
          <span role="columnheader">Correct</span>
          <span role="columnheader">Wrong</span>
          <span role="columnheader">Pass</span>
        </div>
        {sorted.map((player) => (
          <div className="summary-row" key={player} role="row">
            <span>{player}</span>
            <strong>{scores[player] ?? 0}</strong>
            <span>{stats[player]?.correct ?? 0}</span>
            <span>{stats[player]?.wrong ?? 0}</span>
            <span>{stats[player]?.passes ?? 0}</span>
          </div>
        ))}
      </div>
      <div className="summary-actions">
        {!winner ? (
          <button onClick={onNextRound} type="button">
            NEXT ROUND
          </button>
        ) : (
          <button onClick={onPlayAgain} type="button">
            Play again
          </button>
        )}
        <button onClick={onRestart} type="button">
          Change topic
        </button>
      </div>
    </section>
  );
}
