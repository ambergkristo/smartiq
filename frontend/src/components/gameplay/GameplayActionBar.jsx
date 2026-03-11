import { useEffect, useRef } from 'react';
import { getActionHint, getNextActionLabel, getPhaseLabel } from './gameplayState';

export default function GameplayActionBar({
  phase,
  category,
  nextTransition = 'none',
  selectedRank,
  controlsDisabled,
  canPass,
  canAnswer,
  onAnswer,
  onConfirm,
  onCancelConfirm,
  onPass,
  onNext,
  onBackToLobby,
  backLabel = '← Back to lobby',
  currentPlayer
}) {
  const answerButtonRef = useRef(null);
  const passButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const nextButtonRef = useRef(null);
  const nextActionLabel = getNextActionLabel(nextTransition);
  const actionHint = phase === 'RESOLVED' || phase === 'PASSED'
    ? `Resolution ready. Press ${nextActionLabel}.`
    : getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass);

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
        <button
          type="button"
          className="secondary-action gameplay-back-button"
          onClick={onBackToLobby}
        >
          {backLabel}
        </button>
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
            {nextActionLabel}
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
