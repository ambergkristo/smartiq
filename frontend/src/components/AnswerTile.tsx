export default function AnswerTile({ index, option, state, onClick, disabled }) {
  const className = ['answer-tile', `is-${state}`].join(' ');
  const marker = state === 'correct' ? '?' : state === 'wrong' ? '?' : state === 'selected' ? '•' : '';
  const isHidden = state === 'hidden';

  return (
    <button className={className} onClick={onClick} disabled={disabled} type="button" aria-label={`peg-${index + 1}`}>
      <span className="slot-index">{index + 1}</span>
      <span className="slot-text">{isHidden ? 'Hidden peg' : option}</span>
      <span className="slot-marker" aria-hidden>
        {marker}
      </span>
    </button>
  );
}
