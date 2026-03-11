export default function JoinButton({ label, disabled = false, onClick }) {
  return (
    <button
      type="button"
      className="player-join-primary-button"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
