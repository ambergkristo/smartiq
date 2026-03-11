import { getPhaseLabel } from './gameplayState';

export default function PhaseStatusChip({ phase }) {
  return (
    <p className="phase-status-chip" data-phase={phase} data-testid="phase-pill">
      {getPhaseLabel(phase).toUpperCase()}
    </p>
  );
}
