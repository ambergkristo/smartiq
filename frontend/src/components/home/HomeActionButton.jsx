export default function HomeActionButton({ label, detail, onClick, variant = 'primary' }) {
  return (
    <button
      type="button"
      className={`home-action-button${variant === 'secondary' ? ' home-action-button--secondary' : ''}`}
      onClick={onClick}
    >
      <strong>{label}</strong>
      <span>{detail}</span>
    </button>
  );
}
