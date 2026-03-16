import HomeActionButton from './HomeActionButton';
import CherryPickLogo, { isCherryPickBrand } from '../branding/CherryPickLogo';

export default function HomeScreen({
  appTitle,
  tagline,
  warning = '',
  profileName = '',
  profileLevel = 1,
  profileXp = 0,
  onProfileNameChange,
  onPlay,
  onJoinGame,
  onHostGame
}) {
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
                detail="Enter a room code and continue into a live CherryPick board."
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
              <div className="home-screen-profile-head">
                <p className="section-title">Player profile</p>
                <strong>Local solo progress</strong>
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
              <p className="field-hint">Level {profileLevel} | {profileXp} XP saved locally on this browser.</p>
            </div>

            {warning ? <p className="field-hint runtime-warning">{warning}</p> : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
