import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
