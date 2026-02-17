export default function RoundSummary({ players, scores, roundLength, onRestart }) {
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  return (
    <section className="board-surface round-summary">
      <h1>Round Summary</h1>
      <p>Round length: {roundLength} cards</p>
      <ol>
        {sorted.map((player) => (
          <li key={player}>
            {player}: <strong>{scores[player] ?? 0}</strong>
          </li>
        ))}
      </ol>
      <button onClick={onRestart} type="button">
        New round
      </button>
    </section>
  );
}
