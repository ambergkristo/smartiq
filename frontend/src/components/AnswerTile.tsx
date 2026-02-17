export default function AnswerTile({ index, option, state, onClick, disabled }) {
  const className = ['answer-tile', `is-${state}`].join(' ');

  return (
    <button className={className} onClick={onClick} disabled={disabled} type="button">
      <span className="slot-index">{index + 1}</span>
      <span className="slot-text">{option}</span>
    </button>
  );
}
