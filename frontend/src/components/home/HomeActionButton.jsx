export default function HomeActionButton({
  label,
  detail,
  eyebrow = '',
  onClick,
  variant = 'primary'
}) {
  const variantClassName = variant === 'secondary'
    ? ' home-action-button--secondary'
    : ' home-action-button--primary';

  return (
    <button
      type="button"
      className={`home-action-button${variantClassName}`}
      data-variant={variant}
      aria-label={label}
      onClick={onClick}
    >
      {eyebrow ? <span className="home-action-button-eyebrow" aria-hidden="true">{eyebrow}</span> : null}
      <strong>{label}</strong>
      <span className="home-action-button-detail" aria-hidden="true">{detail}</span>
    </button>
  );
}
