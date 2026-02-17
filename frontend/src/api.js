const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8080';

export async function fetchTopics() {
  const res = await fetch(`${API_BASE}/api/topics`);
  if (!res.ok) {
    throw new Error(`Failed to fetch topics: ${res.status}`);
  }
  return res.json();
}

export async function fetchNextCard({ topic, difficulty, sessionId, lang }) {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  if (difficulty) params.set('difficulty', String(difficulty));
  if (sessionId) params.set('sessionId', sessionId);
  if (lang) params.set('lang', lang);

  const res = await fetch(`${API_BASE}/api/cards/next?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch card: ${res.status}`);
  }
  return res.json();
}
