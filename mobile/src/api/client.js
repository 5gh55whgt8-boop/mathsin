import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Scan uploads override this timeout to allow for multi-page recognition.
export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://mathlens-ai-api.onrender.com/api', timeout: 120000 });
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
