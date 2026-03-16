const VARIANT_CONFIG = {
  cherry: {
    label: 'Cherry Round',
    accentClassName: 'is-cherry'
  },
  'double-cherry': {
    label: 'Double Cherry',
    accentClassName: 'is-double-cherry'
  },
  'golden-cherry': {
    label: 'Golden Cherry',
    accentClassName: 'is-golden-cherry'
  }
};

function resolveIndicatorConfig(type, label) {
  const normalizedType = String(type || '').trim().toLowerCase();
  const config = VARIANT_CONFIG[normalizedType];
  if (!config) {
    return null;
  }

  return {
    label: label || config.label,
    accentClassName: config.accentClassName
  };
}

export default function CherryRoundIndicator({
  type,
  label,
  multiplierLabel = ''
}) {
  const config = resolveIndicatorConfig(type, label);

  if (!config) {
    return null;
  }

  return (
    <div
      className={`cherry-round-indicator ${config.accentClassName}`}
      data-testid="question-card-round-indicator"
      data-variant={String(type || '').trim().toLowerCase()}
    >
      <span className="cherry-round-indicator-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M10.4 9.2c-1.1-3-0.8-5.4 0.8-7 1-1.1 2.6-1.6 4.5-1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
          <path
            d="M13.6 8.9c0.2-3.1 1.5-5.2 3.8-6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
          <path
            d="M14.8 2.2c1.7-0.6 3.4-0.5 4.8 0.5-0.6 1.7-1.8 2.8-3.5 3.3-1.5 0.5-2.9 0.3-4.2-0.5 0.6-1.5 1.6-2.6 2.9-3.3Z"
            fill="currentColor"
            opacity="0.76"
          />
          <circle cx="8.8" cy="15.1" r="4.4" fill="currentColor" opacity="0.74" />
          <circle cx="15.4" cy="14.8" r="4.7" fill="currentColor" />
        </svg>
      </span>
      <span className="cherry-round-indicator-copy">
        <span className="cherry-round-indicator-label">{config.label}</span>
        {multiplierLabel ? (
          <span className="cherry-round-indicator-multiplier">{multiplierLabel}</span>
        ) : null}
      </span>
    </div>
  );
}
