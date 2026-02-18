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
  phase,
  onAnswer,
  onConfirm,
  onCancelConfirm,
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
  currentPlayer,
  correctIndexes
}) {
  const revealed = phase === 'RESOLVED' || phase === 'PASSED';
  const canChoose = phase === 'CHOOSING' || phase === 'CONFIRMING';
  const phaseLabel = phase.replace('_', ' ').toLowerCase();

  return (
    <section className="game-board">
      <PlayersPanel
        players={players}
        scores={scores}
        currentPlayerIndex={currentPlayerIndex}
        cardIndex={cardIndex}
        roundLength={roundLength}
        lastAction={lastAction}
        phaseLabel={phaseLabel}
        currentPlayer={currentPlayer}
      />

      <div className="center-board board-surface">
        <header className="card-header">
          <p className="topic-pill">{card.topic}</p>
          <p className="meta-line">
            Difficulty {card.difficulty} | {card.language}
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
              disabled={!canChoose}
            />
          ))}
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
                CHECK
              </button>
              <button onClick={onCancelConfirm} type="button">
                BACK
              </button>
            </>
          ) : null}
          {phase === 'RESOLVED' || phase === 'PASSED' ? (
            <button onClick={onNext} type="button">
              {isLast ? 'ROUND END' : 'NEXT'}
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
