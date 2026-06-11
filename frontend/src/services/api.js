import axios from 'axios';

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach Bearer Token ───────────────────

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle 401 with Token Refresh ────────

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and if we haven't retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing request IS the refresh/login
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      clearTokens();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data } = await axios.post(
        `${api.defaults.baseURL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken }
      );

      const newAccess = data.access_token;
      const newRefresh = data.refresh_token || refreshToken;
      setTokens(newAccess, newRefresh);

      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      // Redirect to login — use window.location to avoid circular deps
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── API Functions ──────────────────────────────────────────────

export async function loginUser(email, password) {
  const response = await api.post('/api/v1/auth/login', { email, password });
  return response.data;
}

export async function registerUser({ fullName, email, password, role }) {
  const response = await api.post('/api/v1/auth/register', {
    full_name: fullName,
    email,
    password,
    role,
  });
  return response.data;
}

export async function getCurrentUserProfile() {
  const response = await api.get('/api/v1/users/me');
  return response.data;
}

// ── Room API Functions ──────────────────────────────────────────

export async function getRooms(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.room_type) query.set('room_type', params.room_type);
  if (params.skip) query.set('skip', params.skip);
  if (params.limit) query.set('limit', params.limit);

  const qs = query.toString();
  const response = await api.get(`/api/v1/rooms${qs ? `?${qs}` : ''}`);
  return response.data;
}

export async function getRoom(roomId) {
  const response = await api.get(`/api/v1/rooms/${roomId}`);
  return response.data;
}

export async function createRoom(data) {
  const response = await api.post('/api/v1/rooms', data);
  return response.data;
}

export async function updateRoom(roomId, data) {
  const response = await api.put(`/api/v1/rooms/${roomId}`, data);
  return response.data;
}

export async function deleteRoom(roomId) {
  const response = await api.delete(`/api/v1/rooms/${roomId}`);
  return response.data;
}

export async function updateRoomStatus(roomId, status) {
  const response = await api.patch(`/api/v1/rooms/${roomId}/status`, { status });
  return response.data;
}

// ── Booking API Functions ────────────────────────────────────────

export async function getBookings(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.room_id) query.set('room_id', params.room_id);
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  if (params.skip !== undefined) query.set('skip', params.skip);
  if (params.limit !== undefined) query.set('limit', params.limit);

  const qs = query.toString();
  const response = await api.get(`/api/v1/bookings${qs ? `?${qs}` : ''}`);
  return response.data;
}

export async function getBooking(bookingId) {
  const response = await api.get(`/api/v1/bookings/${bookingId}`);
  return response.data;
}

export async function createBooking(data) {
  const response = await api.post('/api/v1/bookings', data);
  return response.data;
}

export async function updateBooking(bookingId, data) {
  const response = await api.put(`/api/v1/bookings/${bookingId}`, data);
  return response.data;
}

export async function deleteBooking(bookingId) {
  const response = await api.delete(`/api/v1/bookings/${bookingId}`);
  return response.data;
}

export async function checkInBooking(bookingId) {
  const response = await api.post(`/api/v1/bookings/${bookingId}/check-in`);
  return response.data;
}

export async function checkOutBooking(bookingId) {
  const response = await api.post(`/api/v1/bookings/${bookingId}/check-out`);
  return response.data;
}

export default api;
