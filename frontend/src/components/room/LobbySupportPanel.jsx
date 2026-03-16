import JoinInfoBlock from './JoinInfoBlock';
import QrPlaceholder from './QrPlaceholder';

export default function LobbySupportPanel({ roomCode, joinLink, onBackHome }) {
  return (
    <div className="room-lobby-support-stack" data-testid="lobby-support-panel">
      <JoinInfoBlock roomCode={roomCode} joinLink={joinLink} />
      <QrPlaceholder roomCode={roomCode} />
      <section className="room-lobby-support-actions board-surface">
        <button type="button" className="secondary-action lobby-back-action" onClick={onBackHome}>
          Back to home
        </button>
      </section>
    </div>
  );
}
