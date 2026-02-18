export default function RoundSummary({ players, scores, roundNumber, onNextRound, onRestart, winner }) {
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  return (
    <section className="board-surface round-summary">
      <h1>{winner ? 'Game Over' : 'Round Summary'}</h1>
      <p>{winner ? `${winner} reached 30 points.` : `Round ${roundNumber} complete.`}</p>
      <ol>
        {sorted.map((player) => (
          <li key={player}>
            {player}: <strong>{scores[player] ?? 0}</strong>
          </li>
        ))}
      </ol>
      {!winner ? (
        <button onClick={onNextRound} type="button">
          NEXT ROUND
        </button>
      ) : null}
      <button onClick={onRestart} type="button">
        Back to setup
      </button>
    </section>
  );
}
