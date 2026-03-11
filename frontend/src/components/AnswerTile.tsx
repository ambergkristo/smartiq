const STATE_MARKERS = {
  default: '',
  selected: '\u25ce',
  locked: '\u25cf',
  correct: '\u2713',
  wrong: '\u2717'
};

const STATE_LABELS = {
  selected: 'SELECTED',
  locked: 'LOCKED',
  correct: 'CORRECT',
  wrong: 'WRONG'
};

export default function AnswerTile({ index, option, state, onClick, disabled }) {
  const className = ['answer-tile', `is-${state}`, disabled ? 'is-disabled' : '']
    .filter(Boolean)
    .join(' ');
  const marker = STATE_MARKERS[state] ?? '';
  const stateLabel = STATE_LABELS[state] ?? '';
  const a11yState = disabled && state === 'default'
    ? 'disabled'
    : state === 'default'
      ? 'available'
      : state;

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      type="button"
      data-state={disabled && state === 'default' ? 'disabled' : state}
      aria-label={`answer-${index + 1} ${a11yState}`}
      aria-pressed={state === 'selected' || state === 'locked'}
    >
      <span className="slot-index">{index + 1}</span>
      <span className="slot-text">{option}</span>
      <span className="slot-state-row">
        <span className="slot-marker" aria-hidden>
          {marker}
        </span>
        {stateLabel ? (
          <span className={`slot-state-chip slot-state-chip--${state.toLowerCase()}`}>{stateLabel}</span>
        ) : null}
      </span>
    </button>
  );
}
