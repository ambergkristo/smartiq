import JoinInfoBlock from './JoinInfoBlock';

export default function LobbySupportPanel({ roomCode, joinLink, onResumeRoom, onBackHome, pending = false }) {
  return (
    <div className="room-lobby-support-stack" data-testid="lobby-support-panel">
      <JoinInfoBlock roomCode={roomCode} joinLink={joinLink} />
      <section className="room-lobby-support-actions board-surface">
        <button type="button" className="secondary-action" onClick={onResumeRoom} disabled={pending}>
          Resume room
        </button>
        <button type="button" className="secondary-action lobby-back-action" onClick={onBackHome} disabled={pending}>
          Leave host room
        </button>
      </section>
    </div>
  );
}
