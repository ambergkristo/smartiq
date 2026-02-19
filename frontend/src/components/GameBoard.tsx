import { useEffect, useMemo, useRef, useState } from 'react';
import AnswerTile from './AnswerTile';
import PlayersPanel from './PlayersPanel';

function getTileState(index, selectedIndexes, correctIndexes, revealedIndexes, wrongIndexes) {
  if (revealedIndexes.has(index)) {
    return 'correct';
  }
  if (wrongIndexes.has(index)) {
    return 'wrong';
  }
  if (selectedIndexes.has(index)) {
    return 'selected';
  }
  if (correctIndexes.has(index)) {
    return 'hidden';
  }
  return 'hidden';
}

function actionHint(phase, currentPlayer) {
  switch (phase) {
    case 'CHOOSING':
      return `${currentPlayer}: choose one answer, then press ANSWER or PASS.`;
    case 'CONFIRMING':
      return `${currentPlayer}: confirm with LOCK IN or go BACK.`;
    case 'RESOLVED':
      return 'Answer resolved. Press NEXT to continue turn flow.';
    case 'PASSED':
      return 'Turn passed. Press NEXT for next player or round summary.';
    case 'LOADING_CARD':
      return 'Loading next round card...';
    default:
      return 'Waiting for game state update...';
  }
}

export default function GameBoard({
  card,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  toggleIndex,
  phase,
  onAnswer,
  onConfirm,
  onCancelConfirm,
  onPass,
  onNext,
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
  correctIndexes
}) {
  const canChoose = phase === 'CHOOSING' || phase === 'CONFIRMING';
  const phaseLabel = phase.replace('_', ' ').toLowerCase();
  const layoutRef = useRef(null);
  const [isFallbackLayout, setIsFallbackLayout] = useState(false);
  const [wheelSize, setWheelSize] = useState(560);
  const [questionExpanded, setQuestionExpanded] = useState(false);

  useEffect(() => {
    setQuestionExpanded(false);
  }, [card.id]);

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
      />

      <div className="center-board board-surface">
        <header className="card-header">
          <div className="card-topline">
            <p className="topic-pill">
              {card.topic} • {card.difficulty} • {card.language.toUpperCase()}
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
          <p className="pass-note">Choose one answer then press ANSWER or PASS.</p>
          <p className="action-hint" data-testid="action-hint">
            {actionHint(phase, currentPlayer)}
          </p>
          <p className="pass-note">{passNote}</p>
        </header>

        <div className="answers-shell" data-layout={isFallbackLayout ? 'fallback' : 'wheel'} ref={layoutRef}>
          {isFallbackLayout ? (
            <div className="tile-grid" data-testid="fallback-grid">
              {card.options.map((option, index) => (
                <AnswerTile
                  key={`${card.id}-${index}`}
                  index={index}
                  option={option}
                  state={getTileState(index, selectedIndexes, correctIndexes, revealedIndexes, wrongIndexes)}
                  onClick={() => toggleIndex(index)}
                  disabled={!canChoose}
                />
              ))}
            </div>
          ) : (
            <div className="wheel-board" data-testid="wheel-board" style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}>
              <div className="wheel-hub">
                <span>{card.topic}</span>
              </div>
              {card.options.map((option, index) => (
                <div
                  className="wheel-slot"
                  key={`${card.id}-${index}`}
                  style={{ transform: `translate(calc(-50% + ${wheelPositions[index].x}px), calc(-50% + ${wheelPositions[index].y}px))` }}
                >
                  <AnswerTile
                    index={index}
                    option={option}
                    state={getTileState(index, selectedIndexes, correctIndexes, revealedIndexes, wrongIndexes)}
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
              NEXT CARD
            </button>
          ) : null}
          {phase === 'LOADING_CARD' ? (
            <button disabled type="button">
              LOADING...
            </button>
          ) : null}
          {phase !== 'CHOOSING' && phase !== 'CONFIRMING' && phase !== 'RESOLVED' && phase !== 'PASSED' && phase !== 'LOADING_CARD' ? (
            <button disabled type="button">
              WAITING...
            </button>
          ) : null}
        </footer>
      </div>
    </section>
  );
}
