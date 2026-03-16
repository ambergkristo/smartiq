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
    <div className="answer-grid-shell" data-board-layout="canonical-2x4">
      <div className="answer-grid answer-grid--canonical" data-testid="answer-grid" data-layout="canonical-2x4">
        {card.options.slice(0, 8).map((option, index) => (
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
