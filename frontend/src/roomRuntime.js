export function normalizePlayerName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

export function getRoomLifecycle(roomSessionOrPreview) {
  const source = roomSessionOrPreview?.roomState && typeof roomSessionOrPreview.roomState === 'object'
    ? roomSessionOrPreview.roomState
    : roomSessionOrPreview;
  const phase = String(source?.phase || '').trim().toUpperCase();
  return phase === 'LIVE' ? 'LIVE' : 'WAITING';
}

export function isRoomJoinable(roomSessionOrPreview) {
  const source = roomSessionOrPreview?.roomState && typeof roomSessionOrPreview.roomState === 'object'
    ? roomSessionOrPreview.roomState
    : roomSessionOrPreview;
  if (source && source.joinable === false) {
    return false;
  }
  return getRoomLifecycle(source) === 'WAITING';
}

export function normalizeRoomCodeInput(value) {
  return String(value || '').trim().toUpperCase();
}

export function getRoomPlayerNames(roomSession) {
  const players = Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players : [];
  return Array.from(new Set(players
    .map((player) => normalizePlayerName(player?.displayName || player?.playerId || ''))
    .filter(Boolean)));
}

export function getSelectedRoomPlayerNames(roomSession, selectedPlayerNames) {
  const availablePlayers = getRoomPlayerNames(roomSession);
  if (!Array.isArray(selectedPlayerNames) || selectedPlayerNames.length === 0) {
    return availablePlayers;
  }
  const selectedSet = new Set(
    selectedPlayerNames
      .map((entry) => normalizePlayerName(String(entry || '')))
      .filter(Boolean)
  );
  const selectedPlayers = availablePlayers.filter((entry) => selectedSet.has(entry));
  return selectedPlayers.length > 0 ? selectedPlayers : availablePlayers;
}

export function buildPlayerJoinUrl(roomCode) {
  const normalizedRoomCode = normalizeRoomCodeInput(roomCode);
  if (!normalizedRoomCode) {
    return '';
  }
  if (typeof window === 'undefined') {
    return `#/join/${normalizedRoomCode}`;
  }
  const url = new URL(window.location.href);
  url.hash = `/join/${normalizedRoomCode}`;
  return url.toString();
}
