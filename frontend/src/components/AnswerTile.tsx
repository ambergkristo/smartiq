const STATE_MARKERS = {
  hidden: '',
  selected: '\u25ce',
  correct: '\u2713',
  wrong: '\u2717'
};

export default function AnswerTile({ index, option, state, onClick, disabled }) {
  const className = ['answer-tile', `is-${state}`].join(' ');
  const marker = STATE_MARKERS[state] ?? '';
  const isHidden = state === 'hidden';
  const a11yState = state === 'hidden' ? 'unrevealed' : state;

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      type="button"
      aria-label={`peg-${index + 1} ${a11yState}`}
    >
      <span className="slot-index">{index + 1}</span>
      <span className="slot-text">{isHidden ? 'Hidden peg' : option}</span>
      <span className="slot-marker" aria-hidden>
        {marker}
      </span>
    </button>
  );
}
