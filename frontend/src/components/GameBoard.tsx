import { useEffect, useMemo, useRef, useState } from 'react';
import AnswerTile from './AnswerTile';
import AnswerStateRow from './gameplay/AnswerStateRow';
import GameplayHeader from './gameplay/GameplayHeader';
import QuestionCard from './gameplay/QuestionCard';
import { CATEGORY_COLORS, getActionHint, getCardCategory, getTileState } from './gameplay/gameplayState';

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
  controlsDisabled = false,
  canPass = true
}) {
  const category = getCardCategory(card);
  const canChoose = (phase === 'CHOOSING' || phase === 'CONFIRMING') && !controlsDisabled;
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
  const liveMessage = [
    getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass),
    passNote,
    lastAction
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
      <QuestionCard
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
        </div>
      ) : null}
      <p className="action-hint" data-testid="action-hint">
        {getActionHint(phase, currentPlayer, category, selectedRank, controlsDisabled, canPass)}
      </p>
      <p className="pass-note">{passNote}</p>
      <AnswerStateRow
        selectedIndexes={selectedIndexes}
        revealedIndexes={revealedIndexes}
        wrongIndexes={wrongIndexes}
        optionCount={card.options.length}
        canPass={canPass}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="board-live-region">
        {liveMessage}
      </p>

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
            <div className="wheel-hub-ring" style={{ borderColor: CATEGORY_COLORS[category] || '#53bde0' }}>
              <div className="wheel-hub">
                <p className="wheel-hub-label">Active turn</p>
                <p className="wheel-hub-focus">{currentPlayer}</p>
                <p className="wheel-hub-meta">{category.replace(/_/g, ' ')} live pick</p>
              </div>
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
    </section>
  );
}
