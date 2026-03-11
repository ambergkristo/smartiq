import AnswerTile from '../AnswerTile';
import { getTileState } from './gameplayState';

const PRIMARY_TILE_COUNT = 8;

export default function AnswerGrid({
  card,
  selectedIndexes,
  revealedIndexes,
  wrongIndexes,
  toggleIndex,
  disabled
}) {
  const primaryOptions = card.options.slice(0, PRIMARY_TILE_COUNT);
  const overflowOptions = card.options.slice(PRIMARY_TILE_COUNT);

  return (
    <div className="answer-grid-shell">
      <div className="answer-grid" data-testid="answer-grid">
        {primaryOptions.map((option, index) => (
          <AnswerTile
            key={`${card.cardId || card.id}-${index}`}
            index={index}
            option={option}
            state={getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes)}
            onClick={() => toggleIndex(index)}
            disabled={disabled}
          />
        ))}
      </div>
      {overflowOptions.length > 0 ? (
        <div className="answer-grid-extra" data-testid="answer-grid-extra">
          <p className="section-title">Extra answers</p>
          <div className="answer-grid-extra-list">
            {overflowOptions.map((option, offset) => {
              const index = PRIMARY_TILE_COUNT + offset;
              return (
                <AnswerTile
                  key={`${card.cardId || card.id}-${index}`}
                  index={index}
                  option={option}
                  state={getTileState(index, selectedIndexes, revealedIndexes, wrongIndexes)}
                  onClick={() => toggleIndex(index)}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
