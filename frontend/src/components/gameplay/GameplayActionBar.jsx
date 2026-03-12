import { useEffect, useRef } from 'react';
import { getActionHint, getNextActionLabel, getPhaseLabel } from './gameplayState';

export default function GameplayActionBar({
  phase,
  category,
  nextTransition = 'none',
  controlsDisabled,
  canAnswer,
  onAnswer,
  onConfirm,
  onCancelConfirm,
  onNext,
  onBackToLobby,
  backLabel = 'ā† Back to lobby',
  currentPlayer
}) {
  const answerButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const nextButtonRef = useRef(null);
  const nextActionLabel = getNextActionLabel(nextTransition);
  const actionHint = phase === 'ROUND_REVEAL' || phase === 'ROUND_SUCCESS' || phase === 'ROUND_FAIL'
    ? `Resolution ready. Press ${nextActionLabel}.`
    : getActionHint(phase, currentPlayer, category, controlsDisabled);

  useEffect(() => {
    if (phase === 'QUESTION_ACTIVE') {
      answerButtonRef.current?.focus();
      return;
    }
    if (phase === 'ANSWER_SELECTED') {
      confirmButtonRef.current?.focus();
      return;
    }
    if (phase === 'ROUND_REVEAL' || phase === 'ROUND_SUCCESS' || phase === 'ROUND_FAIL') {
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
        {phase === 'QUESTION_ACTIVE' ? (
          <button
            ref={answerButtonRef}
            type="button"
            className="app-shell-primary-button"
            onClick={onAnswer}
            disabled={!canAnswer}
          >
            ANSWER
          </button>
        ) : null}
        {phase === 'ANSWER_SELECTED' ? (
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
        {phase === 'ROUND_REVEAL' || phase === 'ROUND_SUCCESS' || phase === 'ROUND_FAIL' ? (
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
