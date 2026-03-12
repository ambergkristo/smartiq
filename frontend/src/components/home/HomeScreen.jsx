import HomeActionButton from './HomeActionButton';

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
        <p className="home-screen-kicker">CherryPick modes</p>
        <h1>{appTitle}</h1>
        <p className="home-screen-tagline">{tagline}</p>
        <div className="home-screen-profile" data-testid="home-screen-profile">
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
        <div className="home-screen-actions">
          <HomeActionButton
            label="Play"
            detail="Start a CherryPick solo run immediately."
            onClick={onPlay}
          />
          <HomeActionButton
            label="Join Game"
            detail="Enter a code and move into the live game path."
            onClick={onJoinGame}
            variant="secondary"
          />
          <HomeActionButton
            label="Host Game"
            detail="Open the future CherryPick host path."
            onClick={onHostGame}
            variant="secondary"
          />
        </div>
      </div>
    </section>
  );
}
