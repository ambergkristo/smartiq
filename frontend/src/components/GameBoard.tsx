import { useEffect, useState } from 'react';
import AnswerGrid from './gameplay/AnswerGrid';
import BoardStatusBar from './gameplay/BoardStatusBar';
import CorrectAnswerDisplay from './gameplay/CorrectAnswerDisplay';
import GameplayHeader from './gameplay/GameplayHeader';
import NextStepActionArea from './gameplay/NextStepActionArea';
import PlayerResultList from './gameplay/PlayerResultList';
import QuestionPrompt from './gameplay/QuestionPrompt';
import ResolutionSummary from './gameplay/ResolutionSummary';
import RevealPanel from './gameplay/RevealPanel';
import { CATEGORY_COLORS, getActionHint, getCardCategory, getNextActionLabel } from './gameplay/gameplayState';

export default function GameBoard({
  card,
  selectedIndexes,
  selectedRank,
  revealedIndexes,
  wrongIndexes,
  toggleIndex,
  phase,
  onRankSelect,
  roundNumber,
  passNote,
  lastAction,
  currentPlayer,
  players,
  scores,
  currentPlayerIndex,
  resolutionState,
  nextTransition = 'none',
  eliminatedPlayers,
  passedPlayers,
  controlsDisabled = false,
  canPass = true
}) {
  const category = getCardCategory(card);
  const canChoose = (phase === 'CHOOSING' || phase === 'CONFIRMING') && !controlsDisabled;
  const [questionExpanded, setQuestionExpanded] = useState(false);

  useEffect(() => {
    setQuestionExpanded(false);
  }, [card.cardId, card.id]);

  const isLongQuestion = card.question.length > 180;
  const selectedIndex = selectedIndexes.size > 0 ? [...selectedIndexes][0] : null;
  const selectedOption = selectedIndex != null ? card.options[selectedIndex] ?? `Answer ${selectedIndex + 1}` : 'Choose an answer';
  const nextActionLabel = getNextActionLabel(nextTransition);
  const isResolutionPhase = phase === 'RESOLVED' || phase === 'PASSED';
  const isConfirmPhase = phase === 'CONFIRMING';
  const revealTone = isConfirmPhase
    ? 'confirm'
    : resolutionState?.outcome === 'correct'
      ? 'correct'
      : resolutionState?.outcome === 'incorrect'
        ? 'incorrect'
        : 'passed';
  const revealTitle = isConfirmPhase
    ? 'Selected answer'
    : resolutionState?.outcome === 'correct'
      ? 'Correct answer'
      : resolutionState?.outcome === 'incorrect'
        ? 'Submitted answer'
        : 'Pass recorded';
  const revealValue = isConfirmPhase
    ? selectedOption
    : resolutionState?.outcome === 'passed'
      ? `${resolutionState?.actingPlayer || currentPlayer} passed`
      : resolutionState?.selectedOption || selectedOption;
  const revealDetail = isConfirmPhase
    ? `Lock this answer in for ${currentPlayer}, or go back to change the pick.`
    : resolutionState?.outcome === 'correct'
      ? `${resolutionState?.actingPlayer || currentPlayer} added a correct reveal.`
      : resolutionState?.outcome === 'incorrect'
        ? resolutionState?.revealedOptions?.length
          ? `Previously revealed answers: ${resolutionState.revealedOptions.join(', ')}`
          : 'Current round state does not expose a separate correct reveal for this miss.'
        : resolutionState?.revealedOptions?.length
          ? `Previously revealed answers stay visible: ${resolutionState.revealedOptions.join(', ')}`
          : 'No answer was revealed on pass.';
  const resolutionTitle = isConfirmPhase
    ? 'Lock answer'
    : resolutionState?.outcome === 'correct'
      ? 'Correct answer locked'
      : resolutionState?.outcome === 'incorrect'
        ? 'Incorrect answer'
        : 'Pass recorded';
  const nextActionNote = isConfirmPhase
    ? 'Use LOCK IN to resolve this answer or BACK to change it.'
    : `Use ${nextActionLabel} to continue the live session.`;
  const liveMessage = [
    getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass),
    passNote,
    lastAction,
    isResolutionPhase ? `Next action ${nextActionLabel}.` : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="gameplay-stage board-surface" data-phase={phase}>
      <GameplayHeader
        phase={phase}
        roundNumber={roundNumber}
        category={category}
        topic={card.topic}
        language={card.language}
        currentPlayer={currentPlayer}
      />
      {isConfirmPhase || isResolutionPhase ? (
        <RevealPanel phase={phase} tone={revealTone}>
          <CorrectAnswerDisplay
            title={revealTitle}
            value={revealValue}
            detail={revealDetail}
            tone={revealTone}
          />
          <ResolutionSummary
            phaseTitle={resolutionTitle}
            question={card.question}
            lastAction={lastAction}
            tone={revealTone}
          />
          <PlayerResultList
            players={players}
            scores={scores}
            currentPlayerIndex={currentPlayerIndex}
            resolutionState={resolutionState || { outcome: 'locked', actingPlayer: currentPlayer }}
            eliminatedPlayers={eliminatedPlayers}
            passedPlayers={passedPlayers}
          />
          <NextStepActionArea
            nextActionLabel={isConfirmPhase ? 'LOCK IN' : nextActionLabel}
            note={nextActionNote}
          />
        </RevealPanel>
      ) : (
        <>
          <QuestionPrompt
            question={card.question}
            categoryColor={CATEGORY_COLORS[category] || '#53bde0'}
            isLongQuestion={isLongQuestion}
            questionExpanded={questionExpanded}
            onToggle={() => setQuestionExpanded((prev) => !prev)}
          />
          {category === 'ORDER' ? (
            <div className="rank-selector-card board-surface">
              <p className="rank-selector-label">Choose the rank before you lock an answer.</p>
              <div className="rank-selector" role="radiogroup" aria-label="Rank selector">
                {Array.from({ length: card.options.length }).map((_, idx) => {
                  const rank = idx + 1;
                  const active = selectedRank === rank;
                  return (
                    <button
                      key={rank}
                      type="button"
                      className={`rank-chip${active ? ' selected' : ''}`}
                      onClick={() => onRankSelect(rank)}
                      aria-pressed={active}
                      disabled={!canChoose}
                    >
                      {rank}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <BoardStatusBar
            actionHint={getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass)}
            passNote={passNote}
            selectedIndexes={selectedIndexes}
            revealedIndexes={revealedIndexes}
            wrongIndexes={wrongIndexes}
            optionCount={card.options.length}
            canPass={canPass}
          />
          <AnswerGrid
            card={card}
            selectedIndexes={selectedIndexes}
            revealedIndexes={revealedIndexes}
            wrongIndexes={wrongIndexes}
            phase={phase}
            toggleIndex={toggleIndex}
            disabled={!canChoose}
          />
        </>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="board-live-region">
        {liveMessage}
      </p>
    </section>
  );
}
