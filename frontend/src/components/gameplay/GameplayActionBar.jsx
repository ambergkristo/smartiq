import { useEffect, useRef } from 'react';
import { getActionHint, getPhaseLabel } from './gameplayState';

export default function GameplayActionBar({
  phase,
  category,
  selectedRank,
  controlsDisabled,
  canPass,
  canAnswer,
  onAnswer,
  onConfirm,
  onCancelConfirm,
  onPass,
  onNext,
  currentPlayer
}) {
  const answerButtonRef = useRef(null);
  const passButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const nextButtonRef = useRef(null);
  const actionHint = getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass);

  useEffect(() => {
    if (phase === 'CHOOSING') {
      passButtonRef.current?.focus();
      return;
    }
    if (phase === 'CONFIRMING') {
      confirmButtonRef.current?.focus();
      return;
    }
    if (phase === 'RESOLVED' || phase === 'PASSED') {
      nextButtonRef.current?.focus();
    }
  }, [phase]);

  return (
    <>
      <div className="app-shell-action-copy gameplay-action-copy">
        <span>{getPhaseLabel(phase)}</span>
        <strong>{actionHint}</strong>
      </div>
      <div className="gameplay-action-buttons" data-phase={phase} data-testid="gameplay-action-buttons">
        {phase === 'CHOOSING' ? (
          <>
            <button
              ref={answerButtonRef}
              type="button"
              className="app-shell-primary-button"
              onClick={onAnswer}
              disabled={!canAnswer}
            >
              ANSWER
            </button>
            <button
              ref={passButtonRef}
              type="button"
              className="secondary-action"
              onClick={onPass}
              disabled={controlsDisabled || !canPass}
            >
              PASS
            </button>
          </>
        ) : null}
        {phase === 'CONFIRMING' ? (
          <>
            <button
              ref={confirmButtonRef}
              type="button"
              className="app-shell-primary-button"
              onClick={onConfirm}
              disabled={controlsDisabled}
            >
              LOCK IN
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={onCancelConfirm}
              disabled={controlsDisabled}
            >
              BACK
            </button>
          </>
        ) : null}
        {phase === 'RESOLVED' || phase === 'PASSED' ? (
          <button
            ref={nextButtonRef}
            type="button"
            className="app-shell-primary-button"
            onClick={onNext}
            disabled={controlsDisabled}
          >
            NEXT
          </button>
        ) : null}
        {phase === 'LOADING_CARD' ? (
          <button type="button" className="app-shell-primary-button" disabled>
            LOADING...
          </button>
        ) : null}
      </div>
    </>
  );
}
