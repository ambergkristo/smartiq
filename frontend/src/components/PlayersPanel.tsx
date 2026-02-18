export default function PlayersPanel({
  players,
  scores,
  currentPlayerIndex,
  cardIndex,
  roundLength,
  lastAction,
  phaseLabel,
  currentPlayer
}) {
  return (
    <aside className="players-panel board-surface">
      <h2>Players</h2>
      <p className="round-line">
        Card {cardIndex + 1} / {roundLength}
      </p>
      <p className="round-line">Turn: {currentPlayer}</p>
      <p className="round-line">Phase: {phaseLabel}</p>
      <p className="round-line">Last action: {lastAction}</p>
      <ul>
        {players.map((player, idx) => (
          <li key={player} className={idx === currentPlayerIndex ? 'active' : ''}>
            <span>{player}</span>
            <strong>{scores[player] ?? 0}</strong>
          </li>
        ))}
      </ul>
    </aside>
  );
}
