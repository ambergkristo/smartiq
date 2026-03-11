import HomeActionButton from './HomeActionButton';

export default function HomeScreen({ appTitle, tagline, warning = '', onStartGame, onJoinGame, onPractice }) {
  return (
    <section className="home-screen" data-testid="home-screen">
      <div className="home-screen-panel board-surface">
        <p className="home-screen-kicker">Live quiz entry</p>
        <h1>{appTitle}</h1>
        <p className="home-screen-tagline">{tagline}</p>
        {warning ? <p className="field-hint runtime-warning">{warning}</p> : null}
        <div className="home-screen-actions">
          <HomeActionButton
            label="Start Game"
            detail="Open topic selection and host setup."
            onClick={onStartGame}
          />
          <HomeActionButton
            label="Join Game"
            detail="Enter a room code and join the live room."
            onClick={onJoinGame}
            variant="secondary"
          />
          <HomeActionButton
            label="Practice"
            detail="Open the single-player placeholder flow."
            onClick={onPractice}
            variant="secondary"
          />
        </div>
      </div>
    </section>
  );
}
