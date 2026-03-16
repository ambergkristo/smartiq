function sumPlayerStat(players, stats, key) {
  return players.reduce((total, player) => total + (stats[player]?.[key] ?? 0), 0);
}

export default function RoundSummary({
  players,
  scores,
  stats = {},
  roundNumber,
  onNextRound,
  onRestart,
  onPlayAgain,
  winner,
  mode = 'standard',
  sessionXp = 0,
  profileName = 'Solo Player',
  profileLevel = 1,
  profileXp = 0,
  profileGamesPlayed = 0,
  profileRoundsWon = 0
}) {
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const leader = sorted[0] || '';
  const leaderScore = leader ? scores[leader] ?? 0 : 0;
  const totalCorrect = sumPlayerStat(players, stats, 'correct');
  const totalWrong = sumPlayerStat(players, stats, 'wrong');
  const totalPasses = sumPlayerStat(players, stats, 'passes');
  const isSoloMode = mode === 'solo';
  const title = winner ? 'Game Summary' : 'Round Summary';
  const kicker = winner ? 'Session complete' : 'Round complete';
  const lede = winner ? `${winner} reached 30 points.` : `Round ${roundNumber} complete.`;

  return (
    <section
      className="board-surface round-summary"
      data-mode={mode}
      data-state={winner ? 'game-over' : 'round-complete'}
      data-testid="round-summary"
    >
      <div className="round-summary-hero">
        <div className="round-summary-copy">
          <p className="section-title">{kicker}</p>
          <div className="round-summary-title-row">
            <h1>{title}</h1>
            <span className={`round-summary-result-badge${winner ? ' is-winner' : ''}`}>
              {winner ? `Winner: ${winner}` : `Round ${roundNumber}`}
            </span>
          </div>
          <p className="round-summary-lede">{lede}</p>
        </div>
        <div className="round-summary-metrics" data-testid="round-summary-metrics">
          <article className="round-summary-metric round-summary-metric--emphasis">
            <span>{winner ? 'Winning score' : 'Current lead'}</span>
            <strong>{leaderScore}</strong>
          </article>
          <article className="round-summary-metric">
            <span>Players</span>
            <strong>{players.length}</strong>
          </article>
          <article className="round-summary-metric">
            <span>Correct</span>
            <strong>{totalCorrect}</strong>
          </article>
          <article className="round-summary-metric">
            <span>{winner ? 'Passes' : 'Wrong'}</span>
            <strong>{winner ? totalPasses : totalWrong}</strong>
          </article>
        </div>
      </div>

      {isSoloMode ? (
        <section className="round-summary-progress" data-testid="round-summary-progress">
          <div className="round-summary-progress-head">
            <div>
              <p className="section-title">Progress recap</p>
              <h2>{profileName}</h2>
              <p className="round-summary-progress-copy">Your CherryPick profile totals stay saved on this browser.</p>
            </div>
            <span className="round-summary-progress-badge">Level {profileLevel}</span>
          </div>
          <div className="round-summary-progress-grid">
            <article className="round-summary-progress-card round-summary-progress-card--reward">
              <span>Total XP</span>
              <strong>{profileXp}</strong>
            </article>
            <article className="round-summary-progress-card round-summary-progress-card--reward">
              <span>Session XP</span>
              <strong>{sessionXp}</strong>
            </article>
            <article className="round-summary-progress-card">
              <span>Games</span>
              <strong>{profileGamesPlayed}</strong>
            </article>
            <article className="round-summary-progress-card">
              <span>Rounds won</span>
              <strong>{profileRoundsWon}</strong>
            </article>
          </div>
        </section>
      ) : null}

      <section className="summary-standings" data-testid="summary-standings">
        <div className="summary-standings-head">
          <div>
            <p className="section-title">Final standings</p>
            <h2>{winner ? 'Session results' : 'Round results'}</h2>
          </div>
          {leader ? <span className="summary-standings-chip">Leader: {leader}</span> : null}
        </div>
        <div className="summary-table" role="table" aria-label="Game summary">
          <div className="summary-head" role="row">
            <span role="columnheader">Player</span>
            <span role="columnheader">Score</span>
            <span role="columnheader">Correct</span>
            <span role="columnheader">Wrong</span>
            <span role="columnheader">Pass</span>
          </div>
          {sorted.map((player, index) => (
            <div
              className={`summary-row${winner === player ? ' is-winner' : ''}${index === 0 && !winner ? ' is-leading' : ''}`}
              key={player}
              role="row"
            >
              <span className="summary-player-cell">
                <span className="summary-rank">#{index + 1}</span>
                <span className="summary-player-name">{player}</span>
                {winner === player ? <span className="summary-player-badge">Winner</span> : null}
              </span>
              <strong>{scores[player] ?? 0}</strong>
              <span>{stats[player]?.correct ?? 0}</span>
              <span>{stats[player]?.wrong ?? 0}</span>
              <span>{stats[player]?.passes ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

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
        <button onClick={onRestart} type="button" className="secondary-action">
          Change topic
        </button>
      </div>
    </section>
  );
}
