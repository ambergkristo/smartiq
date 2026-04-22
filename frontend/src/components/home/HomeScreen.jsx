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
  profileRoundsWon = 0,
  onProfileNameChange,
  onPlay,
  onChooseTopic,
  onJoinGame,
  onHostGame
}) {
  const displayProfileName = profileName || 'Solo Player';
  const currentLevelXp = profileXp % 500;
  const progressPercent = Math.max(8, Math.min((currentLevelXp / 500) * 100, 100));
  const futureJoinAvailable = typeof onJoinGame === 'function';
  const futureHostAvailable = typeof onHostGame === 'function';

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
              <span className="home-shell-chip home-shell-chip--future" aria-disabled="true">Join soon</span>
              <span className="home-shell-chip home-shell-chip--future" aria-disabled="true">Host soon</span>
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
                  <button type="button" className="secondary-action" onClick={onChooseTopic}>
                    Daily challenge
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
              </div>
            </aside>

            <div className="home-support-strip">
              <section className="home-mini-module home-mini-module--daily">
                <div>
                  <p className="home-card-kicker">Daily Challenge</p>
                  <h3>Cherry Gauntlet</h3>
                  <p>One featured board, one reset timer, one clean leaderboard push.</p>
                </div>
                <div className="home-module-stats" role="list" aria-label="Daily challenge details">
                  <article className="home-mini-stat" role="listitem">
                    <span>Reset</span>
                    <strong>13h 24m</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Reward</span>
                    <strong>+180 XP</strong>
                  </article>
                  <article className="home-mini-stat" role="listitem">
                    <span>Risk</span>
                    <strong>Double Cherry</strong>
                  </article>
                </div>
              </section>

              <section className="home-mini-module home-mini-module--leaderboard">
                <div>
                  <p className="home-card-kicker">Leaderboard</p>
                  <h3>Tonight&apos;s pace</h3>
                </div>
                <ol aria-label="Leaderboard preview">
                  <li>
                    <span className="home-leaderboard-rank">1</span>
                    <span className="home-leaderboard-player">Nova</span>
                    <span className="home-leaderboard-xp">4,420 XP</span>
                  </li>
                  <li>
                    <span className="home-leaderboard-rank">2</span>
                    <span className="home-leaderboard-player">Vega</span>
                    <span className="home-leaderboard-xp">4,080 XP</span>
                  </li>
                  <li>
                    <span className="home-leaderboard-rank">3</span>
                    <span className="home-leaderboard-player">{displayProfileName}</span>
                    <span className="home-leaderboard-xp">{profileXp} XP</span>
                  </li>
                </ol>
              </section>

              <section className="home-mini-module home-mini-module--future">
                <div>
                  <p className="home-card-kicker">Current scope</p>
                  <h3>Solo owns the product surface right now.</h3>
                  <p>Join and host stay visible as future modes, but the shipped loop is the solo board, daily challenge, and XP climb.</p>
                </div>
                <div className="home-future-chips">
                  <button type="button" className="secondary-action" disabled data-feature={futureJoinAvailable ? 'planned' : 'off'}>
                    Join soon
                  </button>
                  <button type="button" className="secondary-action" disabled data-feature={futureHostAvailable ? 'planned' : 'off'}>
                    Host soon
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
