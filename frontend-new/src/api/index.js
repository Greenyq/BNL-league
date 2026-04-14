import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

const statsApi = axios.create({
  baseURL: '',
  timeout: 30000,
})

// Attach admin session header if present
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('adminSession')
  if (sessionId) config.headers['x-session-id'] = sessionId
  const playerSession = localStorage.getItem('playerSession')
  if (playerSession) config.headers['x-player-session-id'] = playerSession
  return config
})

export const playersApi = {
  getAll: () => api.get('/players/with-cache'),
  getMatches: (battleTag) => api.get(`/matches/${encodeURIComponent(battleTag)}`),
}

export const teamsApi = {
  getAll: () => api.get('/teams'),
}

export const matchesApi = {
  getAll: () => api.get('/matches'),
  getFinalsMatches: () => api.get('/matches/finals'),
}

export const adminApi = {
  login: (login, password) => api.post('/admin/login', { login, password }),
  verify: () => api.get('/admin/verify'),
  logout: () => api.post('/admin/logout'),

  // Players
  createPlayer: (data) => api.post('/players', data),
  updatePlayer: (id, data) => api.put(`/players/${id}`, data),
  deletePlayer: (id) => api.delete(`/players/${id}`),
  lookupW3C: (battleTag) => api.get(`/players/lookup/${encodeURIComponent(battleTag)}`),
  adjustPoints: (data) => api.post('/players/adjust-points', data),
  computeStats: () => statsApi.post('/compute-stats'),

  // Teams
  createTeam: (data) => api.post('/teams', data),
  updateTeam: (id, data) => api.put(`/teams/${id}`, data),
  deleteTeam: (id) => api.delete(`/teams/${id}`),

  // Matches
  createMatch: (data) => api.post('/matches', data),
  updateMatch: (id, data) => api.put(`/matches/${id}`, data),
  deleteMatch: (id) => api.delete(`/matches/${id}`),
}

export default api
