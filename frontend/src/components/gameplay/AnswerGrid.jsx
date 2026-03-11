import AnswerTile from '../AnswerTile';
import { getTileState } from './gameplayState';

export default function AnswerGrid({
  card,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  phase,
  toggleIndex,
  disabled
}) {
  return (
    <div className="answer-grid-shell">
      <div className="answer-grid" data-testid="answer-grid">
        {card.options.map((option, index) => (
          <AnswerTile
            key={`${card.cardId || card.id}-${index}`}
            index={index}
            option={option}
            state={getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes, phase)}
            onClick={() => toggleIndex(index)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
