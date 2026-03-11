export default function RevealPanel({ phase, tone, children }) {
  return (
    <section
      className={`reveal-panel reveal-panel--${tone}`}
      data-phase={phase}
      data-tone={tone}
      data-testid="reveal-panel"
    >
      {children}
    </section>
  );
}
