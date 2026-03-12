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
  const rewardBadgeLabel = roundReward?.badgeLabel || 'Normal round';
  const rewardBadgeClassName = [
    'gameplay-header-reward',
    roundReward?.type ? `is-${roundReward.type}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className="gameplay-header">
      <div className="gameplay-header-copy">
        <p className="gameplay-header-eyebrow">Round {roundNumber}</p>
        <h2>{topic}</h2>
        <div className="gameplay-header-meta">
          <span className={rewardBadgeClassName}>{rewardBadgeLabel}</span>
          <span>{category.replace(/_/g, ' ')}</span>
          <span>{String(language || 'en').toUpperCase()}</span>
          <span>Turn {currentPlayer}</span>
        </div>
      </div>
      <PhaseStatusChip phase={phase} />
    </header>
  );
}
