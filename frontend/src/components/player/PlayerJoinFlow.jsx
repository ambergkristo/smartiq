import { useEffect, useMemo, useState } from 'react';
import JoinButton from './JoinButton';
import JoinStatusPanel from './JoinStatusPanel';
import PlayerNameInput from './PlayerNameInput';
import RoomCodeInput from './RoomCodeInput';
import CherryPickLogo, { isCherryPickBrand } from '../branding/CherryPickLogo';

const STEP = {
  ROOM: 'room',
  NAME: 'name'
};

export default function PlayerJoinFlow({
  screenTestId,
  brandTitle,
  chipLabel,
  title,
  roomCode,
  roomCodeLabel = 'Room code',
  roomCodePlaceholder = 'ABC123',
  roomCodeReadOnly = false,
  displayName,
  displayNameLabel = 'Your display name',
  displayNamePlaceholder = 'Player name',
  pending,
  message,
  error,
  preview,
  previewMissingLabel,
  introCopy,
  roomStepCopy,
  nameStepCopy,
  statusPendingLabel,
  nextLabel = 'Next',
  joinLabel = 'Join game',
  backLabel = 'Back',
  onRoomCodeChange = null,
  onDisplayNameChange,
  onJoin,
  onBack
}) {
  const [step, setStep] = useState(STEP.ROOM);
  const previewPlayers = Array.isArray(preview?.players) ? preview.players : [];
  const previewPhase = String(preview?.phase || '').trim().toUpperCase();
  const previewJoinable = preview ? preview.joinable !== false && previewPhase !== 'LIVE' : true;
  const previewStatusLabel = preview
    ? previewJoinable
      ? 'Open for room entry'
      : 'Host session already live'
    : 'Waiting for room preview';

  useEffect(() => {
    setStep(STEP.ROOM);
  }, [roomCode]);

  const canAdvance = useMemo(
    () => String(roomCode || '').trim().length > 0 && previewJoinable,
    [previewJoinable, roomCode]
  );
  const canJoin = useMemo(
    () => String(displayName || '').trim().length > 0 && canAdvance,
    [displayName, canAdvance]
  );

  return (
    <section className="player-join-screen board-surface" data-step={step} data-testid={screenTestId}>
      <div className="player-join-screen-head">
        <p className="player-join-brand">
          {isCherryPickBrand(brandTitle) ? <CherryPickLogo size="compact" /> : brandTitle}
        </p>
        <span className="player-join-chip">{chipLabel}</span>
      </div>

      <div className="player-join-step-indicator" data-testid={`${screenTestId}-step-indicator`}>
        <span className={`player-join-step${step === STEP.ROOM ? ' is-current' : ' is-complete'}`}>
          1. Code
        </span>
        <span className={`player-join-step${step === STEP.NAME ? ' is-current' : ''}`}>
          2. Name
        </span>
      </div>

      <div className="player-join-hero">
        <p className="section-title">Join game</p>
        <h1>{title}</h1>
        <p>{step === STEP.ROOM ? roomStepCopy : nameStepCopy}</p>
      </div>

      {step === STEP.ROOM ? (
        <div className="player-join-form">
          <RoomCodeInput
            id={`${screenTestId}-room-code`}
            label={roomCodeLabel}
            value={roomCode}
            placeholder={roomCodePlaceholder}
            readOnly={roomCodeReadOnly}
            disabled={pending}
            onChange={onRoomCodeChange}
          />
          <div className="player-join-support-card">
            <span>Status</span>
            <strong>{previewStatusLabel}</strong>
            <p>{introCopy}</p>
          </div>
          {preview && !previewJoinable ? (
            <p className="field-hint">This room is already live. New joins are closed while CherryPick runs as a host-led live game.</p>
          ) : null}
          <JoinStatusPanel
            pending={pending}
            pendingLabel={statusPendingLabel}
            message={message}
            error={error}
          />
          <div className="player-join-actions">
            <JoinButton label={nextLabel} disabled={pending || !canAdvance} onClick={() => setStep(STEP.NAME)} />
            <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
              {backLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="player-join-form">
          <div className="player-join-code-callout">
            <span>{roomCodeLabel}</span>
            <strong>{roomCode}</strong>
          </div>
          <PlayerNameInput
            id={`${screenTestId}-display-name`}
            label={displayNameLabel}
            value={displayName}
            placeholder={displayNamePlaceholder}
            disabled={pending}
            onChange={(event) => onDisplayNameChange(event.target.value)}
          />
          <JoinStatusPanel
            pending={pending}
            pendingLabel={statusPendingLabel}
            message={message}
            error={error}
          />
          <div className="player-join-actions">
            <JoinButton label={joinLabel} disabled={pending || !canJoin} onClick={onJoin} />
            <button type="button" className="secondary-action" onClick={() => setStep(STEP.ROOM)} disabled={pending}>
              Back
            </button>
          </div>
        </div>
      )}

      {preview ? (
        <div className="player-route-preview" data-testid="player-route-preview">
          <div className="player-route-preview-head">
            <p className="section-title">{previewJoinable ? 'Room roster' : 'Live roster'}</p>
            <strong>{previewPlayers.length}</strong>
          </div>
          <p className="field-hint">{previewStatusLabel}</p>
          {previewPlayers.length > 0 ? (
            <ul className="player-route-preview-list">
              {previewPlayers.map((player) => (
                <li key={player.playerId || player.displayName}>
                  <strong>{player.displayName || 'Player'}</strong>
                  <span>{previewJoinable ? 'Joined to the room' : 'Following the host session'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">{previewMissingLabel}</p>
          )}
        </div>
      ) : (
        <p className="field-hint">{previewMissingLabel}</p>
      )}
    </section>
  );
}
