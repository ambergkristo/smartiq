import { useEffect, useMemo, useRef, useState } from 'react';
import AnswerTile from './AnswerTile';
import PlayersPanel from './PlayersPanel';

function getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes) {
  if (revealedIndexes.has(index)) return 'correct';
  if (wrongIndexes.has(index)) return 'wrong';
  if (selectedIndexes.has(index)) return 'selected';
  return 'hidden';
}

function actionHint(phase, currentPlayer, category, selectedRank) {
  if (category === 'ORDER' && phase === 'CHOOSING') {
    return `${currentPlayer}: choose rank ${selectedRank ?? '(1-10)'} and a peg, then ANSWER.`;
  }

  switch (phase) {
    case 'CHOOSING':
      return `${currentPlayer}: reveal one peg, then ANSWER or PASS.`;
    case 'CONFIRMING':
      return `${currentPlayer}: LOCK IN or go BACK.`;
    case 'RESOLVED':
      return 'Attempt resolved. Press NEXT to continue.';
    case 'PASSED':
      return 'Player passed. Press NEXT for next turn.';
    case 'LOADING_CARD':
      return 'Loading next round card...';
    default:
      return 'Waiting for game state update...';
  }
}

const CATEGORY_COLORS = {
  TRUE_FALSE: '#f28b23',
  NUMBER: '#f2cf1d',
  ORDER: '#5ea844',
  CENTURY_DECADE: '#1d3d8f',
  COLOR: '#e35fa8',
  OPEN: '#53bde0'
};

export default function GameBoard({
  card,
  selectedIndexes,
  selectedRank,
  revealedIndexes,
  wrongIndexes,
  toggleIndex,
  phase,
  onAnswer,
  onConfirm,
  onCancelConfirm,
  onPass,
  onNext,
  onRankSelect,
  players,
  scores,
  currentPlayerIndex,
  roundNumber,
  passNote,
  lastAction,
  currentPlayer,
  targetScore,
  eliminatedPlayers,
  passedPlayers,
  starterPlayer
}) {
  const category = String(card?.category || card?.subtopic || 'OPEN').toUpperCase();
  const canChoose = phase === 'CHOOSING' || phase === 'CONFIRMING';
  const phaseLabel = phase.replace('_', ' ').toLowerCase();
  const layoutRef = useRef(null);
  const [isFallbackLayout, setIsFallbackLayout] = useState(false);
  const [wheelSize, setWheelSize] = useState(560);
  const [questionExpanded, setQuestionExpanded] = useState(false);

  useEffect(() => {
    setQuestionExpanded(false);
  }, [card.cardId, card.id]);

  useEffect(() => {
    const target = layoutRef.current;
    if (!target || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      const maxDiameter = Math.max(320, Math.min(width - 16, height - 16, 760));
      setIsFallbackLayout(width < 720 || height < 460);
      setWheelSize(maxDiameter);
    });
    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  const wheelPositions = useMemo(() => {
    const radius = wheelSize * 0.36;
    const step = 360 / Math.max(card.options.length, 1);
    return card.options.map((_, index) => {
      const angle = (step * index - 90) * (Math.PI / 180);
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  }, [card.options, wheelSize]);

  const isLongQuestion = card.question.length > 180;

  return (
    <section className="game-board">
      <PlayersPanel
        players={players}
        scores={scores}
        currentPlayerIndex={currentPlayerIndex}
        roundNumber={roundNumber}
        lastAction={lastAction}
        phaseLabel={phaseLabel}
        currentPlayer={currentPlayer}
        targetScore={targetScore}
        eliminatedPlayers={eliminatedPlayers}
        passedPlayers={passedPlayers}
        starterPlayer={starterPlayer}
      />

      <div className="center-board board-surface">
        <header className="card-header" style={{ borderBottomColor: CATEGORY_COLORS[category] || '#f59b1f' }}>
          <div className="card-topline">
            <p className="topic-pill">
              {category} | {card.topic} | {card.language.toUpperCase()}
            </p>
            <p className="meta-line">Round {roundNumber}</p>
          </div>
          <h2 className={`question-text${!questionExpanded ? ' clamped' : ''}`}>{card.question}</h2>
          {isLongQuestion ? (
            <button
              type="button"
              className="question-toggle"
              onClick={() => setQuestionExpanded((prev) => !prev)}
            >
              {questionExpanded ? 'Show less' : 'Show more'}
            </button>
          ) : null}
          {category === 'ORDER' ? (
            <div className="rank-selector" role="radiogroup" aria-label="Rank selector">
              {Array.from({ length: 10 }).map((_, idx) => {
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
          ) : null}
          <p className="action-hint" data-testid="action-hint">
            {actionHint(phase, currentPlayer, category, selectedRank)}
          </p>
          <p className="pass-note">{passNote}</p>
        </header>

        <div className="answers-shell" data-layout={isFallbackLayout ? 'fallback' : 'wheel'} ref={layoutRef}>
          {isFallbackLayout ? (
            <div className="tile-grid" data-testid="fallback-grid">
              {card.options.map((option, index) => (
                <AnswerTile
                  key={`${card.cardId || card.id}-${index}`}
                  index={index}
                  option={option}
                  state={getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes)}
                  onClick={() => toggleIndex(index)}
                  disabled={!canChoose}
                />
              ))}
            </div>
          ) : (
            <div className="wheel-board" data-testid="wheel-board" style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}>
              <div className="wheel-hub" style={{ borderColor: CATEGORY_COLORS[category] || '#f59b1f' }}>
                <span>{category}</span>
              </div>
              {card.options.map((option, index) => (
                <div
                  className="wheel-slot"
                  key={`${card.cardId || card.id}-${index}`}
                  style={{ transform: `translate(calc(-50% + ${wheelPositions[index].x}px), calc(-50% + ${wheelPositions[index].y}px))` }}
                >
                  <AnswerTile
                    index={index}
                    option={option}
                    state={getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes)}
                    onClick={() => toggleIndex(index)}
                    disabled={!canChoose}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="action-bar">
          {phase === 'CHOOSING' ? (
            <>
              <button onClick={onAnswer} type="button">
                ANSWER
              </button>
              <button onClick={onPass} type="button">
                PASS
              </button>
            </>
          ) : null}
          {phase === 'CONFIRMING' ? (
            <>
              <button onClick={onConfirm} type="button">
                LOCK IN
              </button>
              <button onClick={onCancelConfirm} type="button">
                BACK
              </button>
            </>
          ) : null}
          {phase === 'RESOLVED' || phase === 'PASSED' ? (
            <button onClick={onNext} type="button">
              NEXT
            </button>
          ) : null}
          {phase === 'LOADING_CARD' ? (
            <button disabled type="button">
              LOADING...
            </button>
          ) : null}
        </footer>
      </div>
    </section>
  );
}
