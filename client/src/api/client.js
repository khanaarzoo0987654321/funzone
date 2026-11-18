import axios from 'axios';

const TOKEN_KEY = 'funzone_token';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  },
);

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (data?.details?.length) return data.details.join(' ');
  return data?.error || error?.message || fallback;
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/users/me', payload),
  achievements: () => api.get('/achievements'),
};

export const roomApi = {
  games: () => api.get('/games'),
  create: (payload) => api.post('/rooms', payload),
  get: (code) => api.get(`/rooms/${code}`),
  join: (code) => api.post(`/rooms/${code}/join`),
  leave: (code) => api.post(`/rooms/${code}/leave`),
};

export const matchApi = {
  list: (params) => api.get('/matches', { params }),
  get: (id) => api.get(`/matches/${id}`),
  leaderboard: (params) => api.get('/leaderboard', { params }),
};

export const userApi = {
  get: (id) => api.get(`/users/${id}`),
};
