import { getCherryRoundReward } from '../../state/cherryRounds';

function PlayerRow({ player, score, isActive, isOut }) {
  const rowClassName = [
    'scoreboard-player-row',
    isActive ? 'is-active' : '',
    isOut ? 'is-out' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={rowClassName}>
      <div className="scoreboard-player-copy">
        <strong>{player}</strong>
        <div className="scoreboard-player-flags">
          {isActive ? <span className="player-chip active-chip">TURN</span> : null}
          {isOut ? <span className="player-chip out-chip">OUT</span> : null}
          {!isActive && !isOut ? <span className="player-chip waiting-chip">READY</span> : null}
        </div>
      </div>
      <span className="scoreboard-player-score">{score}</span>
    </li>
  );
}

export default function ScoreBoard({
  players,
  scores,
  currentPlayerIndex,
  roundNumber,
  lastAction,
  phaseLabel,
  currentPlayer,
  targetScore,
  eliminatedPlayers,
  starterPlayer,
  mode = 'standard',
  sessionXp = 0,
  lastRoundXp = 0,
  profileName = 'Solo Player',
  profileLevel = 1,
  profileXp = 0,
  profileGamesPlayed = 0,
  profileRoundsWon = 0
}) {
  const isSoloMode = mode === 'solo';
  const roundReward = getCherryRoundReward(roundNumber);
  const outCount = players.filter((player) => eliminatedPlayers.has(player)).length;
  const activeCount = players.length - outCount;
  const leadingPlayer = players.reduce((leader, player) => {
    if (!leader) {
      return player;
    }
    return (scores[player] ?? 0) > (scores[leader] ?? 0) ? player : leader;
  }, '');
  const leadingScore = leadingPlayer ? scores[leadingPlayer] ?? 0 : 0;

  return (
    <aside className="scoreboard-panel board-surface" data-testid="score-board" data-mode={isSoloMode ? 'solo' : 'standard'}>
      <div className="scoreboard-panel-head">
        <div className="scoreboard-panel-copy">
          <p className="section-title">{isSoloMode ? 'Solo run' : 'Live scoreboard'}</p>
          <h2>Round {roundNumber}</h2>
        </div>
        <div className="scoreboard-target">
          <span>{isSoloMode ? 'Session XP' : 'Target'}</span>
          <strong>{isSoloMode ? sessionXp : targetScore}</strong>
        </div>
      </div>

      <div className="scoreboard-summary" data-testid="scoreboard-summary">
        {isSoloMode ? (
          <>
            <span className="player-chip active-chip">{roundReward.badgeLabel}</span>
            <span className="player-chip waiting-chip">{roundReward.multiplierLabel}</span>
            <span className="player-chip waiting-chip">Boards cleared {Math.max(roundNumber - 1, 0)}</span>
          </>
        ) : (
          <>
            <span className="player-chip active-chip">Active {activeCount}</span>
            <span className="player-chip out-chip">Out {outCount}</span>
          </>
        )}
      </div>

      <div className="scoreboard-status-card" data-testid="scoreboard-status-card">
        <div className="scoreboard-turn-spotlight">
          <span>Current turn</span>
          <strong>{currentPlayer}</strong>
          <em>{phaseLabel}</em>
        </div>
        <div className="scoreboard-status-grid">
          <p><span>{isSoloMode ? 'Mode' : 'Starter'}</span><strong>{isSoloMode ? 'Solo' : starterPlayer}</strong></p>
          <p><span>{isSoloMode ? 'Round type' : 'Leading'}</span><strong>{isSoloMode ? roundReward.label : leadingPlayer ? `${leadingPlayer} - ${leadingScore}` : 'n/a'}</strong></p>
          <p><span>Last call</span><strong>{lastAction || 'Waiting for host action'}</strong></p>
        </div>
      </div>

      {isSoloMode ? (
        <div className="scoreboard-solo-recap" data-testid="solo-scoreboard">
          <p className="scoreboard-solo-metric"><span>Player</span><strong>{profileName || players[0] || 'Solo Player'}</strong></p>
          <p className="scoreboard-solo-metric"><span>Level</span><strong>{profileLevel}</strong></p>
          <p className="scoreboard-solo-metric is-emphasis"><span>Total XP</span><strong>{profileXp}</strong></p>
          <p className="scoreboard-solo-metric"><span>Multiplier</span><strong>{roundReward.multiplierLabel}</strong></p>
          <p className="scoreboard-solo-metric is-emphasis"><span>Session XP</span><strong>{sessionXp}</strong></p>
          <p className="scoreboard-solo-metric"><span>Round XP</span><strong>{lastRoundXp}</strong></p>
          <p className="scoreboard-solo-metric"><span>Games</span><strong>{profileGamesPlayed}</strong></p>
          <p className="scoreboard-solo-metric"><span>Rounds won</span><strong>{profileRoundsWon}</strong></p>
        </div>
      ) : (
        <ul className="scoreboard-player-list" aria-label="Player scoreboard">
          {players.map((player, index) => (
            <PlayerRow
              key={player}
              player={player}
              score={scores[player] ?? 0}
              isActive={index === currentPlayerIndex}
              isOut={eliminatedPlayers.has(player)}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}
