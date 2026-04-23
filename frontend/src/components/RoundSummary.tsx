import { getCherryRoundReward } from '../state/cherryRounds';

function sumPlayerStat(players, stats, key) {
  return players.reduce((total, player) => total + (stats[player]?.[key] ?? 0), 0);
}

function formatRoundReward(roundNumber) {
  const reward = getCherryRoundReward(roundNumber);
  return {
    label: reward?.label || 'Normal round',
    multiplierLabel: reward?.multiplierLabel || 'XP x1',
    multiplier: reward?.multiplier || 1
  };
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
  lastRoundXp = 0,
  lastRoundRewardBreakdown = null,
  profileName = 'Solo Player',
  profileLevel = 1,
  profileXp = 0,
  profileGamesPlayed = 0,
  profileRoundsWon = 0,
  profileRoundsPlayed = 0,
  profileBestRoundXp = 0,
  profileBestSessionXp = 0,
  profileBestWinStreak = 0
}) {
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const leader = sorted[0] || '';
  const leaderScore = leader ? scores[leader] ?? 0 : 0;
  const totalCorrect = sumPlayerStat(players, stats, 'correct');
  const totalWrong = sumPlayerStat(players, stats, 'wrong');
  const isDailyMode = mode === 'daily';
  const isSoloMode = mode === 'solo' || isDailyMode;
  const title = isDailyMode ? 'Daily result' : winner ? 'Run complete' : 'Round complete';
  const kicker = isDailyMode ? 'Daily challenge' : winner ? 'Session result' : 'Round result';
  const reward = formatRoundReward(roundNumber);
  const roundOutcome = lastRoundXp > 0 ? 'Reward secured' : 'Reward lost';
  const roundBaseXp = lastRoundRewardBreakdown?.baseXp ?? (reward.multiplier > 0 ? Math.round(lastRoundXp / reward.multiplier) : lastRoundXp);
  const speedBonusXp = lastRoundRewardBreakdown?.speedBonusXp ?? 0;
  const cherryBoostXp = lastRoundRewardBreakdown?.cherryBoostXp ?? Math.max(lastRoundXp - roundBaseXp - speedBonusXp, 0);
  const levelBaseXp = Math.max((profileLevel - 1) * 500, 0);
  const levelProgressXp = Math.max(profileXp - levelBaseXp, 0);
  const levelProgressPercent = Math.max(8, Math.min((levelProgressXp / 500) * 100, 100));
  const primaryAction = isDailyMode ? onRestart : winner ? onPlayAgain : onNextRound;
  const primaryActionLabel = isDailyMode ? 'Back home' : 'Play next round';

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
            <span className={`round-summary-result-badge${winner || lastRoundXp > 0 ? ' is-winner' : ''}`}>
              {isSoloMode ? roundOutcome : winner ? `Winner: ${winner}` : reward.label}
            </span>
          </div>
          <p className="round-summary-lede">
            {isSoloMode
              ? lastRoundXp > 0
                ? isDailyMode
                  ? 'The daily board paid out. Your result is saved for today.'
                  : 'The board paid out. Bank the XP, keep the tempo, and press straight into the next round.'
                : isDailyMode
                  ? 'The daily board is complete for today. The next reset opens a fresh attempt.'
                  : 'The miss cut the round reward immediately. The next board is the recovery path.'
              : winner
                ? `${winner} reached the winning score.`
                : `Round ${roundNumber} is locked and the standings are updated.`}
          </p>
          {isSoloMode ? (
            <div className="round-summary-hero-chips">
              <span className="round-summary-progress-badge">{reward.label}</span>
              <span className="round-summary-progress-badge">{reward.multiplierLabel}</span>
              <span className="round-summary-progress-badge">Round XP {lastRoundXp}</span>
            </div>
          ) : null}
        </div>

        <section className="round-summary-spotlight" data-testid="round-summary-metrics">
          <p className="section-title">{isSoloMode ? 'XP readout' : 'Session snapshot'}</p>
          <h2>{isSoloMode ? `${lastRoundXp} XP this round` : leader ? `${leader} leads` : 'No leader yet'}</h2>
          {isSoloMode ? (
            <div className="round-summary-level-meter" aria-label="Level progress">
              <div className="round-summary-level-meter-fill" style={{ width: `${levelProgressPercent}%` }} />
            </div>
          ) : null}
          <div className="round-summary-stat-grid">
            <article className="round-summary-stat-card">
              <span>{isSoloMode ? 'Session XP' : winner ? 'Winning score' : 'Lead score'}</span>
              <strong>{isSoloMode ? sessionXp : leaderScore}</strong>
            </article>
            <article className="round-summary-stat-card">
              <span>Correct picks</span>
              <strong>{totalCorrect}</strong>
            </article>
            <article className="round-summary-stat-card">
              <span>Wrong picks</span>
              <strong>{totalWrong}</strong>
            </article>
            <article className="round-summary-stat-card">
              <span>{isSoloMode ? 'Next level' : 'Players'}</span>
              <strong>{isSoloMode ? `${Math.max(500 - levelProgressXp, 0)} XP` : players.length}</strong>
            </article>
          </div>
        </section>
      </div>

      <div className="round-summary-body">
        <section className="round-summary-breakdown">
          <div>
            <p className="section-title">XP breakdown</p>
            <h2>{profileName}</h2>
            <p className="round-summary-progress-copy">
              Clear results should be readable at a glance: what the round paid, what the session gained,
              and how far the profile moved.
            </p>
          </div>
          <div className="round-summary-breakdown-grid">
            <article className="round-summary-breakdown-card">
              <span>Base XP</span>
              <strong>{roundBaseXp}</strong>
            </article>
            <article className="round-summary-breakdown-card round-summary-breakdown-card--reward">
              <span>Speed bonus</span>
              <strong>{speedBonusXp}</strong>
            </article>
            <article className="round-summary-breakdown-card round-summary-breakdown-card--reward">
              <span>Cherry boost</span>
              <strong>{cherryBoostXp}</strong>
            </article>
            <article className="round-summary-breakdown-card round-summary-breakdown-card--reward">
              <span>Round XP</span>
              <strong>{lastRoundXp}</strong>
            </article>
            <article className="round-summary-breakdown-card round-summary-breakdown-card--reward">
              <span>Session XP</span>
              <strong>{sessionXp}</strong>
            </article>
          </div>
        </section>

        <section className="round-summary-progress" data-testid="round-summary-progress">
          <div className="round-summary-progress-head">
            <div>
              <p className="section-title">Profile progression</p>
              <h2>{profileName}</h2>
              <p className="round-summary-progress-copy">Your solo totals stay saved on this browser between runs.</p>
            </div>
            <span className="round-summary-progress-badge">Level {profileLevel}</span>
          </div>
          <div className="round-summary-level-meter" aria-label="Profile level progress">
            <div className="round-summary-level-meter-fill" style={{ width: `${levelProgressPercent}%` }} />
          </div>
          <div className="round-summary-progress-grid">
            <article className="round-summary-progress-card round-summary-progress-card--reward">
              <span>Total XP</span>
              <strong>{profileXp}</strong>
            </article>
            <article className="round-summary-progress-card round-summary-progress-card--reward">
              <span>Games</span>
              <strong>{profileGamesPlayed}</strong>
            </article>
            <article className="round-summary-progress-card">
              <span>Rounds won</span>
              <strong>{profileRoundsWon}{profileRoundsPlayed > 0 ? ` / ${profileRoundsPlayed}` : ''}</strong>
            </article>
            <article className="round-summary-progress-card">
              <span>Best run</span>
              <strong>{profileBestSessionXp}</strong>
            </article>
            <article className="round-summary-progress-card">
              <span>Best round</span>
              <strong>{profileBestRoundXp}</strong>
            </article>
            <article className="round-summary-progress-card">
              <span>Best streak</span>
              <strong>{profileBestWinStreak}</strong>
            </article>
          </div>
        </section>
      </div>

      <section className="summary-standings" data-testid="summary-standings">
        <div className="summary-standings-head">
          <div>
            <p className="section-title">Standings</p>
            <h2>{winner ? 'Final results' : 'Current results'}</h2>
          </div>
          {leader ? <span className="summary-standings-chip">Leader: {leader}</span> : null}
        </div>
        <div className="summary-table" role="table" aria-label="Game summary">
          <div className="summary-head" role="row">
            <span role="columnheader">Player</span>
            <span role="columnheader">Score</span>
            <span role="columnheader">Correct</span>
            <span role="columnheader">Wrong</span>
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
            </div>
          ))}
        </div>
      </section>

      <div className="summary-actions">
        <button onClick={primaryAction} type="button">
          {primaryActionLabel}
        </button>
        <button onClick={onRestart} type="button" className="secondary-action">
          Change topic
        </button>
      </div>
    </section>
  );
}
