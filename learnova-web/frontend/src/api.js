const API_BASE = import.meta.env.VITE_API_URL || 'https://learnova-backend-b03i.onrender.com';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || 'Something went wrong. Please try again.');
  return data;
}

export const api = {
  dashboard: () => request('/api/dashboard'),
  summary: (text, mode) => request('/api/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, mode }) }),
  fileSummary: (file, mode) => { const body = new FormData(); body.append('file', file); body.append('mode', mode); return request('/api/file-summary', { method: 'POST', body }); },
  quiz: (text, difficulty, count) => request('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, difficulty, count }) }),
  explain: (topic, level) => request('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, level }) }),
  plan: (payload) => request('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  chat: (message) => request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
  save: (title, score, total) => request('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, score, total }) })
};
