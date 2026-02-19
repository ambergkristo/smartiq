import { useEffect, useMemo, useRef, useState } from 'react';
import PlayersPanel from './PlayersPanel';

const CATEGORY_COLORS = {
  TRUE_FALSE: '#ef8f32',
  NUMBER: '#f1c83d',
  ORDER: '#5ba85d',
  CENTURY_DECADE: '#1c3f84',
  COLOR: '#d95b95',
  OPEN: '#79c7de'
};

function resolveCategory(card) {
  const key = String(card?.category ?? '').toUpperCase();
  return CATEGORY_COLORS[key] ? key : 'TRUE_FALSE';
}

function resolveOptionText(option) {
  if (typeof option === 'string') return option;
  if (option && typeof option === 'object' && typeof option.text === 'string') return option.text;
  return '';
}

function actionHint(phase, currentPlayer) {
  switch (phase) {
    case 'CHOOSING':
      return `${currentPlayer}: reveal a marker, then ANSWER or PASS.`;
    case 'CONFIRMING':
      return `${currentPlayer}: confirm with LOCK IN or go BACK.`;
    case 'RESOLVED':
      return 'Answer resolved. Press NEXT to continue.';
    case 'PASSED':
      return 'Turn passed. Press NEXT.';
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
  correctIndexes,
  numberGuess,
  orderRank,
  onNumberGuessChange,
  onOrderRankChange
}) {
  const boardRef = useRef(null);
  const [boardSize, setBoardSize] = useState(560);
  const [revealedByClick, setRevealedByClick] = useState(() => new Set());
  const category = resolveCategory(card);
  const categoryColor = CATEGORY_COLORS[category];

  useEffect(() => {
    const target = boardRef.current;
    if (!target || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height || width;
      const minSide = Math.min(width, height);
      setBoardSize(Math.max(320, Math.min(minSide - 12, 780)));
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setRevealedByClick(new Set());
  }, [card?.id]);

  const pegPositions = useMemo(() => {
    const radius = boardSize * 0.42;
    const step = 360 / Math.max(card.options.length, 1);
    return card.options.map((_, index) => {
      const angle = (step * index - 90) * (Math.PI / 180);
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  }, [boardSize, card.options]);

  function handlePegClick(index) {
    setRevealedByClick((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    toggleIndex(index);
  }

  return (
    <section className="game-board">
      <PlayersPanel
        players={players}
        scores={scores}
        currentPlayerIndex={currentPlayerIndex}
        roundNumber={roundNumber}
        lastAction={lastAction}
        phaseLabel={phase.replace('_', ' ').toLowerCase()}
        currentPlayer={currentPlayer}
        targetScore={targetScore}
        eliminatedPlayers={eliminatedPlayers}
        passedPlayers={passedPlayers}
      />

      <div className="center-board board-surface">
        <header className="card-header smart10-header">
          <p className="topic-pill">
            {card.topic} - {category} - {card.language.toUpperCase()} - Round {roundNumber}
          </p>
          <p className="action-hint" data-testid="action-hint">
            {actionHint(phase, currentPlayer)}
          </p>
          <p className="pass-note">{passNote}</p>
        </header>

        <div className="smart10-stage" ref={boardRef}>
          <div className="smart10-board" data-testid="smart10-board" style={{ width: `${boardSize}px`, height: `${boardSize}px` }}>
            <div className="smart10-face" />
            <div className="smart10-category-ring" style={{ borderColor: categoryColor }} />
            <div className="smart10-center">
              <h2>{card.question}</h2>
            </div>

            {card.options.map((option, index) => {
              const resolvedCorrect = revealedIndexes.has(index) || correctIndexes.has(index);
              const resolvedWrong = wrongIndexes.has(index);
              const isOpen = revealedByClick.has(index);

              return (
                <button
                  key={`${card.id}-${index}`}
                  type="button"
                  className={`smart10-peg${isOpen ? ' is-open' : ''}${resolvedCorrect ? ' is-correct' : ''}${resolvedWrong ? ' is-wrong' : ''}${selectedIndexes.has(index) ? ' is-selected' : ''}`}
                  style={{ transform: `translate(calc(-50% + ${pegPositions[index].x}px), calc(-50% + ${pegPositions[index].y}px))` }}
                  onClick={() => handlePegClick(index)}
                  aria-label={`Marker ${index + 1}`}
                  title={isOpen ? resolveOptionText(option) : `Marker ${index + 1}`}
                >
                  <span className="peg-content">{isOpen ? resolveOptionText(option) : index + 1}</span>
                  {resolvedCorrect ? <span className="peg-feedback">OK</span> : null}
                  {resolvedWrong ? <span className="peg-feedback">X</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {category === 'NUMBER' ? (
          <div className="category-input">
            <label htmlFor="number-guess">Number guess</label>
            <input
              id="number-guess"
              type="text"
              value={numberGuess}
              onChange={(event) => onNumberGuessChange(event.target.value)}
              placeholder="Type exact value"
            />
          </div>
        ) : null}

        {category === 'ORDER' ? (
          <div className="category-input">
            <label htmlFor="order-rank">Target position</label>
            <select id="order-rank" value={orderRank} onChange={(event) => onOrderRankChange(Number(event.target.value))}>
              {Array.from({ length: 10 }).map((_, idx) => (
                <option key={idx} value={idx + 1}>
                  {idx + 1}
                </option>
              ))}
            </select>
          </div>
        ) : null}

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
