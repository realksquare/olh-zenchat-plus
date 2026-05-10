import axios from 'axios';
import { Platform } from 'react-native';
import { getItemAsync } from './storage';

// Automatically updated for physical device testing on Wi-Fi
const DEV_API_URL = Platform.OS === 'web' ? 'http://localhost:4000/api' : 'http://172.30.211.231:4000/api';
const PROD_API_URL = 'https://your-backend-slug.fly.dev/api'; // Update this after Fly.io deployment

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const WS_URL = API_URL.replace('http', 'ws').replace('/api', '/socket');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await getItemAsync('zenToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token for request', error);
  }
  return config;
});

export default api;
