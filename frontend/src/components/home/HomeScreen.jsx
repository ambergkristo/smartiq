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
  onJoinGame,
  onHostGame
}) {
  const displayProfileName = profileName || 'Solo Player';

  return (
    <section className="home-screen" data-testid="home-screen">
      <div className="home-screen-panel board-surface">
        <div className="home-screen-brand-block">
          <p className="home-screen-kicker">CherryPick entry</p>
          <h1 className={isCherryPickBrand(appTitle) ? 'home-screen-brand-heading' : ''}>
            {isCherryPickBrand(appTitle) ? <CherryPickLogo size="hero" /> : appTitle}
          </h1>
          <p className="home-screen-tagline">{tagline}</p>
        </div>

        <div className="home-screen-content">
          <div className="home-screen-primary-column">
            <div className="home-screen-cta-intro">
              <p className="home-screen-cta-kicker">Choose your path</p>
              <p className="home-screen-cta-copy">
                PLAY is the fast solo route. JOIN and HOST stay one tap away for live rooms.
              </p>
            </div>

            <div className="home-screen-actions">
              <HomeActionButton
                label="Play"
                eyebrow="Solo now"
                detail="Start a CherryPick solo run immediately."
                onClick={onPlay}
              />
              <HomeActionButton
                label="Join Game"
                eyebrow="Live room"
                detail="Enter a room code, join the live roster, and follow the host-led session from your device."
                onClick={onJoinGame}
                variant="secondary"
              />
              <HomeActionButton
                label="Host Game"
                eyebrow="Run the room"
                detail="Open the host path, prepare the topic, and launch when players are ready."
                onClick={onHostGame}
                variant="secondary"
              />
            </div>
          </div>

          <aside className="home-screen-side-panel">
            <div className="home-screen-profile" data-testid="home-screen-profile">
              <div className="home-screen-profile-topline">
                <div className="home-screen-profile-head">
                  <p className="section-title">Player profile</p>
                  <strong>Local solo progress</strong>
                </div>
                <span className="home-screen-profile-badge">Level {profileLevel}</span>
              </div>

              <div className="home-screen-profile-hero">
                <div>
                  <span className="home-screen-profile-hero-label">Current player</span>
                  <h2>{displayProfileName}</h2>
                </div>
                <p className="home-screen-profile-hero-xp">
                  <span>Total XP</span>
                  <strong>{profileXp}</strong>
                </p>
              </div>

              <label htmlFor="guest-display-name">Guest name</label>
              <input
                id="guest-display-name"
                type="text"
                value={profileName}
                onChange={(event) => onProfileNameChange?.(event.target.value)}
                placeholder="Solo Player"
                autoComplete="nickname"
              />
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
              <p className="field-hint">Level {profileLevel} profile saved locally on this browser.</p>
            </div>

            {warning ? <p className="field-hint runtime-warning">{warning}</p> : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
