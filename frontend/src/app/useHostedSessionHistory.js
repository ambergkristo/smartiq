import { useCallback } from 'react';
import { duplicateServerGameSession, fetchServerGameSession, resumeServerGameSession } from '../api';
import { getRoomPlayerNames } from '../roomRuntime';
import { STRINGS } from './appConfig';
import { buildPlaceholderPlayers, buildRecentHostedSessionReview, parsePlayers, resolveRecentHostedSessionConfig } from './appSessionUtils';

export function useHostedSessionHistory({
  config,
  setConfig,
  roomSession,
  reviewedHostedSession,
  setReviewedHostedSession,
  setActiveHostedSession,
  setWorkspaceError,
  setWorkspacePending,
  setWorkspaceMessage,
  launchRound,
  clearRoom,
  serverEngine
}) {
  const canLaunchRecentHostedSessions = useCallback((session) => {
    if (String(session?.gameId || '').trim()) {
      return true;
    }
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    return parsePlayers(nextConfig.playersText).length > 0;
  }, [config, roomSession, reviewedHostedSession]);

  const handleUseRecentHostedSession = useCallback((session) => {
    setActiveHostedSession(session || null);
    setWorkspaceError('');
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    if (roomSession?.roomCode) {
      clearRoom();
    }
    setConfig((prev) => ({
      ...prev,
      topic: nextConfig.topic,
      lang: nextConfig.lang,
      playersText: nextConfig.playersText
    }));
    const messageParts = [
      `${STRINGS.recentHostedSessionPreparedPrefix} ${nextConfig.topic || STRINGS.recentHostedSessionTopicFallback}`,
      nextConfig.lang ? nextConfig.lang.toUpperCase() : String(config.lang || 'en').toUpperCase()
    ];
    if (reviewedHostedSession?.gameId === session?.gameId && Array.isArray(reviewedHostedSession?.scoreboard) && reviewedHostedSession.scoreboard.length > 0) {
      messageParts.push(STRINGS.recentHostedSessionUseReviewedRoster);
    } else if (getRoomPlayerNames(roomSession).length > 0) {
      messageParts.push(STRINGS.recentHostedSessionUseRoomRoster);
    } else if (buildPlaceholderPlayers(session?.playerCount).length > 0) {
      messageParts.push(STRINGS.recentHostedSessionUsePlaceholderRoster);
    }
    setWorkspaceMessage(messageParts.join(' | '));
  }, [clearRoom, config, reviewedHostedSession, roomSession, setActiveHostedSession, setConfig, setWorkspaceError, setWorkspaceMessage]);

  const handleReviewRecentHostedSession = useCallback(async (session) => {
    const gameIdToReview = String(session?.gameId || '').trim();
    if (!gameIdToReview) {
      setWorkspaceError(STRINGS.recentHostedSessionReviewLoadError);
      return;
    }

    setActiveHostedSession(session || null);
    setWorkspaceError('');
    setWorkspacePending(true);
    setWorkspaceMessage(`${STRINGS.recentHostedSessionReviewPrefix} ${session?.topic || STRINGS.recentHostedSessionTopicFallback}`);
    try {
      const snapshot = await fetchServerGameSession(gameIdToReview);
      setReviewedHostedSession(buildRecentHostedSessionReview(snapshot, session));
      setWorkspaceMessage(`${STRINGS.recentHostedSessionReviewReadyPrefix} ${session?.topic || STRINGS.recentHostedSessionTopicFallback}`);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || STRINGS.recentHostedSessionReviewLoadError;
      setWorkspaceError(detail);
    } finally {
      setWorkspacePending(false);
    }
  }, [setActiveHostedSession, setReviewedHostedSession, setWorkspaceError, setWorkspaceMessage, setWorkspacePending]);

  const handleResumeRecentHostedSession = useCallback(async (session) => {
    const gameIdToResume = String(session?.gameId || '').trim();
    if (!gameIdToResume) {
      setWorkspaceError(STRINGS.recentHostedSessionReviewLoadError);
      return;
    }

    setActiveHostedSession(session || null);
    setWorkspaceError('');
    setWorkspacePending(true);
    setWorkspaceMessage(`${STRINGS.recentHostedSessionResumePrefix} ${session?.topic || STRINGS.recentHostedSessionTopicFallback}`);
    try {
      const response = await resumeServerGameSession(gameIdToResume);
      const snapshot = response?.snapshot && typeof response.snapshot === 'object'
        ? response.snapshot
        : response;
      const resumedPlayers = Array.isArray(snapshot?.players)
        ? snapshot.players.map((player) => String(player?.displayName || '').trim()).filter(Boolean)
        : [];
      const resumedTopic = String(snapshot?.boardState?.topic || session?.topic || '').trim();
      const resumedLanguage = String(config.lang || 'en').trim().toLowerCase() || 'en';
      setConfig((prev) => ({
        ...prev,
        topic: resumedTopic,
        lang: resumedLanguage,
        playersText: resumedPlayers.join(', ')
      }));
      serverEngine.clearError();
      serverEngine.adoptCreatedSession(response, {
        players: resumedPlayers,
        language: resumedLanguage,
        topic: resumedTopic
      });
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || STRINGS.recentHostedSessionReviewLoadError;
      setWorkspaceError(detail);
    } finally {
      setWorkspacePending(false);
    }
  }, [config.lang, serverEngine, setActiveHostedSession, setConfig, setWorkspaceError, setWorkspaceMessage, setWorkspacePending]);

  const handleLaunchRecentHostedSession = useCallback((session) => {
    setActiveHostedSession(session || null);
    setWorkspaceError('');
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    if (!session?.gameId) {
      setConfig((prev) => ({
        ...prev,
        topic: nextConfig.topic,
        lang: nextConfig.lang,
        playersText: nextConfig.playersText
      }));
      setWorkspaceMessage(`${STRINGS.recentHostedSessionLaunchPrefix} ${nextConfig.topic || STRINGS.recentHostedSessionTopicFallback}`);
      launchRound({
        playersText: nextConfig.playersText,
        topic: nextConfig.topic,
        language: nextConfig.lang
      });
      return;
    }

    setWorkspacePending(true);
    setWorkspaceMessage(`${STRINGS.recentHostedSessionLaunchPrefix} ${nextConfig.topic || STRINGS.recentHostedSessionTopicFallback}`);
    duplicateServerGameSession(session.gameId)
      .then((response) => {
        const snapshot = response?.snapshot && typeof response.snapshot === 'object'
          ? response.snapshot
          : response;
        const duplicatedPlayers = Array.isArray(snapshot?.players)
          ? snapshot.players.map((player) => String(player?.displayName || '').trim()).filter(Boolean)
          : parsePlayers(nextConfig.playersText);
        const duplicatedTopic = String(snapshot?.boardState?.topic || nextConfig.topic || '').trim();
        setConfig((prev) => ({
          ...prev,
          topic: duplicatedTopic,
          lang: nextConfig.lang,
          playersText: duplicatedPlayers.join(', ')
        }));
        serverEngine.clearError();
        serverEngine.adoptCreatedSession(response, {
          language: nextConfig.lang
        });
      })
      .catch((error) => {
        const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
          ? error.detail
          : error?.message || STRINGS.recentHostedSessionReviewError;
        setWorkspaceError(detail);
      })
      .finally(() => {
        setWorkspacePending(false);
      });
  }, [config, launchRound, reviewedHostedSession, roomSession, serverEngine, setActiveHostedSession, setConfig, setWorkspaceError, setWorkspaceMessage, setWorkspacePending]);

  return {
    canLaunchRecentHostedSessions,
    handleUseRecentHostedSession,
    handleReviewRecentHostedSession,
    handleResumeRecentHostedSession,
    handleLaunchRecentHostedSession
  };
}
