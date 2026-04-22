export default function NextStepActionArea({ nextActionLabel, note, tone = 'neutral' }) {
  return (
    <section
      className={`next-step-action-area next-step-action-area--${tone}`}
      data-tone={tone}
      data-testid="next-step-action-area"
    >
      <p className="section-title">Next move</p>
      <h3>{nextActionLabel}</h3>
      <p>{note}</p>
    </section>
  );
}
