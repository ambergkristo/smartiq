import HomeActionButton from './HomeActionButton';
import CherryPickLogo, { isCherryPickBrand } from '../branding/CherryPickLogo';

export default function HomeScreen({
  appTitle,
  tagline,
  warning = '',
  profileName = '',
  profileLevel = 1,
  profileXp = 0,
  profileGamesPlayed = 0,
  profileRoundsPlayed = 0,
  profileRoundsWon = 0,
  profileBestRoundXp = 0,
  profileBestSessionXp = 0,
  profileCurrentWinStreak = 0,
  profileBestWinStreak = 0,
  analyticsSummary = null,
  dailyChallenge = null,
  onProfileNameChange,
  onPlay,
  onDailyChallenge,
  onChooseTopic
}) {
  const displayProfileName = profileName || 'Solo Player';
  const currentLevelXp = profileXp % 500;
  const progressPercent = Math.max(8, Math.min((currentLevelXp / 500) * 100, 100));
  const winRate = profileRoundsPlayed > 0 ? Math.round((profileRoundsWon / profileRoundsPlayed) * 100) : 0;
  const dailyStatus = dailyChallenge?.status || 'available';
  const dailyCompleted = dailyStatus === 'completed';
  const dailyOutcomeLabel = dailyCompleted
    ? dailyChallenge?.outcome === 'success'
      ? 'Cleared today'
      : 'Attempt complete'
    : dailyStatus === 'started'
      ? 'In progress'
      : 'Ready today';
  const runsStarted = analyticsSummary?.runsStarted || 0;
  const replays = analyticsSummary?.replays || 0;
  const roundWins = analyticsSummary?.roundWins || 0;
  const roundFails = analyticsSummary?.roundFails || 0;
  const resultViews = analyticsSummary?.resultViews || 0;

  return (
    <section className="home-screen" data-testid="home-screen">
      <div className="home-screen-shell">
        <div className="home-screen-panel">
          <header className="home-command-bar" aria-label="CherryPick overview">
            <div className="home-command-brand">
              {isCherryPickBrand(appTitle) ? <CherryPickLogo size="header" /> : <strong>{appTitle}</strong>}
              <p className="home-command-copy">Premium all-or-nothing quiz rounds built for fast repeat play.</p>
            </div>

            <div className="home-command-status">
              <span className="home-shell-chip">Solo live now</span>
              <span className="home-shell-chip">8-tile board</span>
            </div>
          </header>

          <div className="home-main-grid">
            <section className="home-hero-panel" aria-label="Play solo">
              <div className="home-hero-copy">
                <p className="home-screen-kicker">Single-player first</p>
                <h1 className={isCherryPickBrand(appTitle) ? 'home-screen-brand-heading' : ''}>
                  {isCherryPickBrand(appTitle) ? <CherryPickLogo size="hero" /> : appTitle}
                </h1>
                <p className="home-screen-tagline">{tagline}</p>
                <h2>Pick carefully. One wrong answer kills the round reward.</h2>
                <p className="home-hero-brief">
                  Built for tense solo boards, fast repeat runs, and visible XP progression without room-flow clutter.
                </p>
                <div className="home-hero-metrics" role="list" aria-label="CherryPick highlights">
                  <article className="home-hero-metric" role="listitem">
                    <span>Round rule</span>
                    <strong>All or nothing</strong>
                  </article>
                  <article className="home-hero-metric" role="listitem">
                    <span>Board format</span>
                    <strong>4 x 2 board</strong>
                  </article>
                  <article className="home-hero-metric" role="listitem">
                    <span>Reward loop</span>
                    <strong>XP + cherry boosts</strong>
                  </article>
                </div>
              </div>

              <div className="home-hero-actions-panel">
                <HomeActionButton
                  label="Play Solo"
                  eyebrow="Instant run"
                  detail="Jump straight into the next CherryPick board with your saved solo runner."
                  onClick={onPlay}
                />
                <div className="home-hero-actions">
                  <button type="button" className="secondary-action" onClick={onChooseTopic}>
                    Choose topic
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={onDailyChallenge}
                    disabled={dailyCompleted || typeof onDailyChallenge !== 'function'}
                    aria-disabled={dailyCompleted || typeof onDailyChallenge !== 'function'}
                  >
                    {dailyCompleted ? 'Daily complete' : 'Daily challenge'}
                  </button>
                </div>
                {warning ? <p className="field-hint runtime-warning">{warning}</p> : null}
              </div>
            </section>

            <aside className="home-progress-panel" data-testid="home-screen-profile">
              <div className="home-progress-topline">
                <div>
                  <p className="section-title">Profile snapshot</p>
                  <strong>Solo progression</strong>
                </div>
                <span className="home-screen-profile-badge">Level {profileLevel}</span>
              </div>

              <div className="home-progress-hero">
                <div>
                  <span className="home-progress-label">Current runner</span>
                  <h2>{displayProfileName}</h2>
                </div>
                <p className="home-progress-total">
                  <span>Total XP</span>
                  <strong>{profileXp}</strong>
                </p>
              </div>

              <label htmlFor="guest-display-name">Display name</label>
              <input
                id="guest-display-name"
                type="text"
                value={profileName}
                onChange={(event) => onProfileNameChange?.(event.target.value)}
                placeholder="Solo Player"
                autoComplete="nickname"
              />

              <div className="home-progress-track" aria-label="Level progress">
                <div className="home-progress-track-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="field-hint">Next level in {Math.max(500 - currentLevelXp, 0)} XP.</p>

              <div className="home-screen-profile-metrics" role="list" aria-label="Profile progression summary">
                <article className="home-screen-profile-metric home-screen-profile-metric--emphasis" role="listitem">
                  <span>Saved XP</span>
                  <strong>{profileXp}</strong>
                </article>
                <article className="home-screen-profile-metric" role="listitem">
                  <span>Games</span>
                  <strong>{profileGamesPlayed}</strong>
                </article>
                <article className="home-screen-profile-metric" role="listitem">
                  <span>Rounds won</span>
                  <strong>{profileRoundsWon}</strong>
                </article>
                <article className="home-screen-profile-metric" role="listitem">
                  <span>Win rate</span>
                  <strong>{winRate}%</strong>
                </article>
              </div>
            </aside>

            <div className="home-support-strip">
              <section className="home-mini-module home-mini-module--daily">
                <div>
                  <p className="home-card-kicker">Daily challenge</p>
                  <h3>{dailyCompleted ? `${dailyChallenge?.sessionXp || 0} XP logged for today.` : 'One fresh board is ready today.'}</h3>
                  <p>
                    The daily board uses the live CherryPick runtime and records one local result per calendar day
                    for this runner profile.
                  </p>
                </div>
                <div className="home-module-stats" role="list" aria-label="Daily challenge details">
                  <article className="home-mini-stat" role="listitem">
                    <span>Status</span>
                    <strong>{dailyOutcomeLabel}</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Round XP</span>
                    <strong>{dailyChallenge?.roundXp || 0}</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Date</span>
                    <strong>{dailyChallenge?.date || 'Today'}</strong>
                  </article>
                </div>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={onDailyChallenge}
                  disabled={dailyCompleted || typeof onDailyChallenge !== 'function'}
                >
                  {dailyCompleted ? 'Come back tomorrow' : 'Play daily board'}
                </button>
              </section>

              <section className="home-mini-module home-mini-module--leaderboard">
                <div>
                  <p className="home-card-kicker">Personal best</p>
                  <h3>{profileBestSessionXp > 0 ? `${profileBestSessionXp} XP best run` : 'Set the first score to chase.'}</h3>
                  <p>
                    This is the live solo benchmark for {displayProfileName}. It updates from completed boards on
                    this browser, so replay has a real target before public rankings ship.
                  </p>
                </div>
                <div className="home-module-stats" role="list" aria-label="Personal best summary">
                  <article className="home-mini-stat" role="listitem">
                    <span>Best run</span>
                    <strong>{profileBestSessionXp}</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Best round</span>
                    <strong>{profileBestRoundXp}</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Best streak</span>
                    <strong>{profileBestWinStreak}</strong>
                  </article>
                </div>
                <p className="field-hint">Current streak: {profileCurrentWinStreak}</p>
              </section>

              <section className="home-mini-module home-mini-module--future">
                <div>
                  <p className="home-card-kicker">Replay rhythm</p>
                  <h3>{runsStarted > 0 ? `${runsStarted} solo runs tracked.` : 'Your first run starts the funnel.'}</h3>
                  <p>
                    These local events measure first visit, run starts, round outcomes, result views, and replays
                    for this runner profile.
                  </p>
                </div>
                <div className="home-module-stats" role="list" aria-label="Replay funnel summary">
                  <article className="home-mini-stat" role="listitem">
                    <span>Replays</span>
                    <strong>{replays}</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Wins / fails</span>
                    <strong>{roundWins} / {roundFails}</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Results</span>
                    <strong>{resultViews}</strong>
                  </article>
                </div>
                <p className="field-hint">Backed by local replay-funnel events from the current runner profile.</p>
                <div className="home-future-chips">
                  <span className="home-shell-chip">First visit</span>
                  <span className="home-shell-chip">Run starts</span>
                  <span className="home-shell-chip">Round outcomes</span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
