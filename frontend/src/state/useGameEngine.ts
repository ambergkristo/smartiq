/**
 * @deprecated SmartIQ gameplay is server-authoritative. Use useServerGameEngine instead.
 */
export function useGameEngine() {
  throw new Error('useGameEngine is deprecated. Use useServerGameEngine for server-authoritative gameplay.');
}
