// src/api/client.js — Axios wrapper for all backend calls

import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Attach token to every request
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username, password, role) =>
  API.post('/auth/login', { username, password, role });

// ── Players ──────────────────────────────────────────────────────────────────
export const fetchPlayers  = () => API.get('/players');
export const updatePlayer  = (id, data) => API.put(`/players/${id}`, data);
export const importPlayerCSV = (file) => {
  const form = new FormData();
  form.append('file', file);
  return API.post('/players/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// ── Matches ──────────────────────────────────────────────────────────────────
export const fetchStadiums   = () => API.get('/matches/stadiums');
export const createMatch     = (data) => API.post('/matches', data);
export const recordState     = (matchId, data) => API.post(`/matches/${matchId}/state`, data);
export const recordWeather   = (matchId, data) => API.post(`/matches/${matchId}/weather`, data);
export const getLatestState  = (matchId) => API.get(`/matches/${matchId}/state/latest`);

// ── Recommendations ──────────────────────────────────────────────────────────
export const getRecommendation = (matchId, stateId, role) =>
  API.post('/recommendations/generate', { match_id: matchId, state_id: stateId, role });

export const getModelPrediction = (payload) =>
  API.post('/recommendations/predict-direct', payload);

export const getHistory = (matchId) => API.get(`/recommendations/${matchId}`);

// ── Dataset Analytics ───────────────────────────────────────────────────────
export const getMatchupAnalysis = (batter, bowler) =>
  API.get('/matchups', { params: { batter, bowler } });

export const fetchAnalyticsVenues = () => API.get('/venues');

export const getVenueAnalytics = (venue) =>
  API.get(`/venues/${encodeURIComponent(venue)}/analytics`);
