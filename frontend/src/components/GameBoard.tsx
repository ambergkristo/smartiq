import AnswerTile from './AnswerTile';
import PlayersPanel from './PlayersPanel';

function getTileState(index, selectedIndexes, revealed, correctIndexes) {
  const selected = selectedIndexes.has(index);
  if (!revealed) {
    return selected ? 'selected' : 'hidden';
  }
  if (correctIndexes.has(index)) {
    return 'correct';
  }
  return selected ? 'wrong' : 'revealed';
}

export default function GameBoard({
  card,
  selectedIndexes,
  toggleIndex,
  revealed,
  onReveal,
  onPass,
  onNext,
  isLast,
  players,
  scores,
  currentPlayerIndex,
  cardIndex,
  roundLength,
  passNote,
  lastAction,
  correctIndexes
}) {
  return (
    <section className="game-board">
      <PlayersPanel
        players={players}
        scores={scores}
        currentPlayerIndex={currentPlayerIndex}
        cardIndex={cardIndex}
        roundLength={roundLength}
        lastAction={lastAction}
      />

      <div className="center-board board-surface">
        <header className="card-header">
          <p className="topic-pill">{card.topic}</p>
          <p className="meta-line">
            Difficulty {card.difficulty} · {card.language}
          </p>
          <h2>{card.question}</h2>
          <p className="pass-note">{passNote}</p>
        </header>

        <div className="tile-grid">
          {card.options.map((option, index) => (
            <AnswerTile
              key={`${card.id}-${index}`}
              index={index}
              option={option}
              state={getTileState(index, selectedIndexes, revealed, correctIndexes)}
              onClick={() => toggleIndex(index)}
              disabled={revealed}
            />
          ))}
        </div>

        <footer className="action-bar">
          {!revealed ? (
            <>
              <button onClick={onReveal} type="button">
                ANSWER
              </button>
              <button onClick={onPass} type="button">
                PASS
              </button>
            </>
          ) : (
            <button onClick={onNext} type="button">
              {isLast ? 'ROUND END' : 'NEXT'}
            </button>
          )}
        </footer>
      </div>
    </section>
  );
}
