export default function NextStepActionArea({ nextActionLabel, note }) {
  return (
    <section className="next-step-action-area" data-testid="next-step-action-area">
      <p className="section-title">Next host action</p>
      <h3>{nextActionLabel}</h3>
      <p>{note}</p>
    </section>
  );
}
