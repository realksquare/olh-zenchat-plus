import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Automatically updated for physical device testing on Wi-Fi
export const API_URL = 'http://172.30.211.140:4000/api';
export const WS_URL = 'ws://172.30.211.140:4000/socket';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('zenToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token for request', error);
  }
  return config;
});

export default api;
