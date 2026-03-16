import { useId } from 'react';

const DEFAULT_LABEL = 'CherryPick';

function isCherryPickBrand(value) {
  return String(value || '').trim().toLowerCase() === DEFAULT_LABEL.toLowerCase();
}

export default function CherryPickLogo({
  label = DEFAULT_LABEL,
  size = 'header',
  className = '',
  wordmark = true
}) {
  const gradientSeed = useId().replace(/:/g, '');
  const leftGradientId = `cherrypickCherryLeft${gradientSeed}`;
  const rightGradientId = `cherrypickCherryRight${gradientSeed}`;
  const classes = ['cherrypick-logo', `cherrypick-logo--${size}`];
  if (className) {
    classes.push(className);
  }

  return (
    <span className={classes.join(' ')}>
      <span className="cherrypick-logo-icon" aria-hidden="true">
        <svg viewBox="0 0 40 36" focusable="false">
          <defs>
            <linearGradient id={leftGradientId} x1="6" y1="18" x2="20" y2="31" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#A72839" />
              <stop offset="1" stopColor="#7A1E2C" />
            </linearGradient>
            <linearGradient id={rightGradientId} x1="19" y1="17" x2="34" y2="31" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#D84C60" />
              <stop offset="1" stopColor="#C53346" />
            </linearGradient>
          </defs>

          <path
            d="M17.5 14.2c-1.8-4.9-1.4-9 1.3-11.8 1.7-1.8 4.3-2.7 7.6-2.4"
            fill="none"
            stroke="#7A1E2C"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M22.8 14c0.5-5.4 2.7-8.8 6.3-10.3"
            fill="none"
            stroke="#7A1E2C"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M24.4 2.1c2.8-1 5.6-0.8 8 0.8-1 2.8-3 4.7-5.9 5.6-2.5 0.8-4.9 0.5-7-0.8 1-2.6 2.7-4.4 4.9-5.6Z"
            fill="#4E8F67"
          />
          <path
            d="M16.1 15.2c0.9 0 1.7 0.1 2.5 0.4 2.5 0.8 4.5 3 5.1 5.9 0.7 3.2-0.4 6.4-2.6 8.3-0.9 0.8-2.1 1.5-3.4 1.8-4.7 1.2-9.4-1.8-10.6-6.6-1.2-4.8 1.6-9.4 6.4-10.5 0.9-0.2 1.7-0.3 2.6-0.3Z"
            fill={`url(#${leftGradientId})`}
          />
          <path
            d="M24.2 14.7c0.9 0 1.8 0.1 2.7 0.4 2.6 0.8 4.6 3 5.3 5.9 0.6 2.8-0.1 5.6-1.8 7.6-1 1.2-2.4 2-4 2.5-4.8 1.3-9.7-1.6-11-6.4-1.3-4.8 1.5-9.7 6.4-11 0.8-0.2 1.6-0.3 2.4-0.3Z"
            fill={`url(#${rightGradientId})`}
          />
          <circle cx="13.8" cy="20.4" r="2.1" fill="rgba(255,255,255,0.18)" />
          <path
            d="M26.1 18.1c2.2 0 4 1.8 4 4 0 0.8-0.2 1.5-0.6 2.1"
            fill="none"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="27.4" cy="16.9" r="1.6" fill="#FFF8F4" />
        </svg>
      </span>
      {wordmark ? (
        <span className="cherrypick-logo-wordmark">{label}</span>
      ) : null}
    </span>
  );
}

export { isCherryPickBrand };
