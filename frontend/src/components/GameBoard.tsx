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
import SoloRoundResult from './gameplay/SoloRoundResult';
import { getCherryRoundReward } from '../state/cherryRounds';
import { getActionHint, getCardCategory, getNextActionLabel } from './gameplay/gameplayState';

export default function GameBoard({
  card,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  toggleIndex,
  phase,
  roundNumber,
  lastAction,
  currentPlayer,
  players,
  scores,
  currentPlayerIndex,
  resolutionState,
  nextTransition = 'none',
  eliminatedPlayers,
  controlsDisabled = false,
  mode = 'standard',
  sessionXp = 0,
  lastRoundXp = 0,
  profileName = 'Solo Player',
  profileLevel = 1,
  profileXp = 0,
  profileGamesPlayed = 0
}) {
  const category = getCardCategory(card);
  const canChoose = (phase === 'QUESTION_ACTIVE' || phase === 'ANSWER_SELECTED') && !controlsDisabled;
  const [questionExpanded, setQuestionExpanded] = useState(false);

  useEffect(() => {
    setQuestionExpanded(false);
  }, [card.cardId, card.id]);

  const isLongQuestion = card.question.length > 180;
  const selectedIndex = selectedIndexes.size > 0 ? [...selectedIndexes][0] : null;
  const selectedOption = selectedIndex != null ? card.options[selectedIndex] ?? '' : 'Choose an answer';
  const nextActionLabel = getNextActionLabel(nextTransition);
  const roundReward = getCherryRoundReward(roundNumber);
  const isSoloMode = mode === 'solo';
  const isResolutionPhase = phase === 'ROUND_REVEAL' || phase === 'ROUND_SUCCESS' || phase === 'ROUND_FAIL';
  const isConfirmPhase = phase === 'ANSWER_SELECTED';
  const boardLocked = controlsDisabled || isConfirmPhase || isResolutionPhase;
  const revealTone = isConfirmPhase
    ? 'confirm'
    : resolutionState?.outcome === 'correct'
      ? 'correct'
      : resolutionState?.outcome === 'success'
        ? 'correct'
        : 'incorrect';
  const revealTitle = isConfirmPhase
    ? 'Selected answer'
    : resolutionState?.outcome === 'correct'
      ? 'Correct answer'
      : resolutionState?.outcome === 'success'
        ? 'Round success'
        : 'Submitted answer';
  const revealValue = isConfirmPhase
    ? selectedOption
    : resolutionState?.selectedOption || selectedOption;
  const revealDetail = isConfirmPhase
    ? isSoloMode
      ? 'Lock this answer in, or step back before you risk the round reward.'
      : `Lock this answer in for ${currentPlayer}, or go back to change the pick.`
    : resolutionState?.outcome === 'correct'
      ? `${resolutionState?.actingPlayer || currentPlayer} added a correct reveal.`
      : resolutionState?.outcome === 'success'
        ? 'All correct answers were found. The round reward converts cleanly into XP.'
        : resolutionState?.revealedOptions?.length
          ? `Correct answers already found: ${resolutionState.revealedOptions.join(', ')}`
          : 'The wrong answer ends the round immediately. XP for this round is zero.';
  const resolutionTitle = isConfirmPhase
    ? 'Lock answer'
    : resolutionState?.outcome === 'correct'
      ? 'Correct answer locked'
      : resolutionState?.outcome === 'success'
        ? 'Round success'
        : 'Round failed';
  const nextActionNote = isConfirmPhase
    ? isSoloMode
      ? 'Lock the pick to reveal the board state, or back out and change the answer before the round breaks.'
      : 'Use LOCK IN to resolve this answer or BACK to change it.'
    : resolutionState?.outcome === 'correct'
      ? 'Use NEXT to keep pressing the board.'
      : isSoloMode
        ? `Use ${nextActionLabel} to move into the next CherryPick board.`
        : `Use ${nextActionLabel} to continue the live session.`;
  const liveMessage = [
    getActionHint(phase, currentPlayer, category, controlsDisabled),
    lastAction,
    isResolutionPhase ? `Next action ${nextActionLabel}.` : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="gameplay-stage board-surface" data-phase={phase} data-mode={mode}>
      <GameplayHeader
        phase={phase}
        roundNumber={roundNumber}
        category={category}
        topic={card.topic}
        language={card.language}
        currentPlayer={currentPlayer}
        roundReward={roundReward}
      />
      {isSoloMode ? (
        <div className="solo-gameplay-strip" data-testid="solo-scoreboard">
          <article className="solo-gameplay-stat solo-gameplay-stat--profile">
            <span>Runner</span>
            <strong>{profileName || currentPlayer}</strong>
            <em>Level {profileLevel}</em>
          </article>
          <article className="solo-gameplay-stat">
            <span>Session XP</span>
            <strong>{sessionXp}</strong>
            <em>Round XP {lastRoundXp}</em>
          </article>
          <article className="solo-gameplay-stat solo-gameplay-stat--reward">
            <span>Reward state</span>
            <strong>{roundReward.label}</strong>
            <em>{roundReward.multiplierLabel}</em>
          </article>
          <article className="solo-gameplay-stat">
            <span>Total XP</span>
            <strong>{profileXp}</strong>
            <em>Games {profileGamesPlayed}</em>
          </article>
        </div>
      ) : null}

      <div className="gameplay-board-layout" data-testid="gameplay-board-layout">
        <div className="gameplay-board-question-stack">
          <QuestionPrompt
            question={card.question}
            roundReward={roundReward}
            isLongQuestion={isLongQuestion}
            questionExpanded={questionExpanded}
            onToggle={() => setQuestionExpanded((prev) => !prev)}
          />
          <BoardStatusBar
            actionHint={getActionHint(phase, currentPlayer, category, controlsDisabled)}
            selectedIndexes={selectedIndexes}
            revealedIndexes={revealedIndexes}
            wrongIndexes={wrongIndexes}
            optionCount={Math.min(card.options.length, 8)}
            roundReward={roundReward}
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
              {isSoloMode && !isConfirmPhase ? (
                <SoloRoundResult
                  outcome={resolutionState?.outcome}
                  selectedOption={resolutionState?.selectedOption || selectedOption}
                  selectedOptions={resolutionState?.selectedOptions || []}
                  correctOptions={resolutionState?.correctOptions || []}
                  roundLabel={resolutionState?.roundLabel || roundReward.label}
                  xpMultiplierLabel={resolutionState?.xpMultiplierLabel || roundReward.multiplierLabel}
                  xpGained={resolutionState?.xpGained ?? 0}
                  totalXp={resolutionState?.totalXp ?? 0}
                />
              ) : (
                <PlayerResultList
                  players={players}
                  scores={scores}
                  currentPlayerIndex={currentPlayerIndex}
                  resolutionState={resolutionState || { outcome: 'locked', actingPlayer: currentPlayer }}
                  eliminatedPlayers={eliminatedPlayers}
                  tone={revealTone}
                />
              )}
              <NextStepActionArea
                nextActionLabel={isConfirmPhase ? 'LOCK IN' : nextActionLabel}
                note={nextActionNote}
                tone={revealTone}
              />
            </RevealPanel>
          ) : null}
        </div>
        <AnswerGrid
          card={card}
          selectedIndexes={selectedIndexes}
          revealedIndexes={revealedIndexes}
          wrongIndexes={wrongIndexes}
          phase={phase}
          toggleIndex={toggleIndex}
          disabled={!canChoose || boardLocked}
        />
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="board-live-region">
        {liveMessage}
      </p>
    </section>
  );
}
