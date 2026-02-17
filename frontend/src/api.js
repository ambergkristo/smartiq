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

export async function fetchRandomCard(topic) {
  const url = topic
    ? `${API_BASE}/api/cards/random?topic=${encodeURIComponent(topic)}`
    : `${API_BASE}/api/cards/random`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch card: ${res.status}`);
  }
  return res.json();
}
