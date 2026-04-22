import PhaseStatusChip from './PhaseStatusChip';

export default function GameplayHeader({
  phase,
  roundNumber,
  category,
  topic,
  language,
  currentPlayer,
  roundReward
}) {
  return (
    <header className="gameplay-header">
      <div className="gameplay-header-copy">
        <p className="gameplay-header-eyebrow">Round {roundNumber}</p>
        <h2>{topic}</h2>
        <div className="gameplay-header-meta">
          <span>{category.replace(/_/g, ' ')}</span>
          <span>{roundReward?.multiplierLabel || 'XP x1'}</span>
          <span>{String(language || 'en').toUpperCase()}</span>
          <span>Runner {currentPlayer}</span>
        </div>
      </div>
      <PhaseStatusChip phase={phase} />
    </header>
  );
}
