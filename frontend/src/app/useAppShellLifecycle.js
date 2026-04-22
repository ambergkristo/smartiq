import { useCallback, useEffect, useState } from 'react';
import { fetchTopics, resolveTopicsErrorState } from '../api';
import { CONFIG_STORAGE_KEY, STARTUP_PHASE, STRINGS } from './appConfig';
import { resolveEntryRoute, resolvePlayerJoinRoute } from './appPersistence';

export function useAppShellLifecycle({ config, setConfig }) {
  const [entryRoute, setEntryRoute] = useState(resolveEntryRoute());
  const [playerJoinRoute, setPlayerJoinRoute] = useState(resolvePlayerJoinRoute());
  const [topics, setTopics] = useState([]);
  const [startup, setStartup] = useState({
    phase: STARTUP_PHASE.LOADING,
    error: null,
    warmup: null
  });

  const loadTopics = useCallback(async () => {
    setStartup({
      phase: STARTUP_PHASE.LOADING,
      error: null,
      warmup: null
    });

    try {
      const data = await fetchTopics({
        onWarmupChange: ({ attempt, totalAttempts, nextDelayMs }) => {
          setStartup({
            phase: STARTUP_PHASE.WARMING,
            error: {
              title: STRINGS.backendWarmupTitle,
              detail: STRINGS.backendWarmupDetail
            },
            warmup: {
              attempt,
              totalAttempts,
              nextDelayMs
            }
          });
        }
      });
      setTopics(data);
      if (data.length > 0) {
        setStartup({
          phase: STARTUP_PHASE.READY,
          error: null,
          warmup: null
        });
        setConfig((prev) => {
          const topicExists = data.some((entry) => entry.topic === prev.topic);
          return { ...prev, topic: topicExists ? prev.topic : '' };
        });
        return;
      }

      setStartup({
        phase: STARTUP_PHASE.TOPICS_EMPTY,
        error: null,
        warmup: null
      });
    } catch (error) {
      const resolved = resolveTopicsErrorState(error);
      setStartup({
        phase:
          resolved.kind === 'content-unhealthy'
            ? STARTUP_PHASE.CONTENT_UNHEALTHY
            : resolved.kind === 'forbidden'
              ? STARTUP_PHASE.FORBIDDEN
              : resolved.kind === 'server-error'
                ? STARTUP_PHASE.SERVER_ERROR
                : resolved.kind === 'not-found'
                  ? STARTUP_PHASE.NOT_FOUND
                  : STARTUP_PHASE.BACKEND_UNREACHABLE,
        error: resolved,
        warmup: null
      });
    }
  }, [setConfig]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    function handleHashChange() {
      setEntryRoute(resolveEntryRoute());
      setPlayerJoinRoute(resolvePlayerJoinRoute());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme);
  }, [config.theme]);

  return {
    entryRoute,
    setEntryRoute,
    loadTopics,
    playerJoinRoute,
    setPlayerJoinRoute,
    startup,
    topics
  };
}
