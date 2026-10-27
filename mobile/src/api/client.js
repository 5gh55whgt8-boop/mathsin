import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const productionApiUrl = 'https://mathlens-ai-api.onrender.com/api';
const configuredApiUrl = typeof process.env.EXPO_PUBLIC_API_URL === 'string'
  ? process.env.EXPO_PUBLIC_API_URL.trim()
  : '';

export function normalizeApiUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return productionApiUrl;
  const withoutApiSuffix = trimmed.replace(/(?:\/api)+$/i, '');
  return `${withoutApiSuffix}/api`;
}

export const API_BASE_URL = normalizeApiUrl(configuredApiUrl || productionApiUrl);

// Scan uploads override this timeout to allow for multi-page recognition.
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 120000 });
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function describeApiFailure(error, operation) {
  const status = error?.response?.status;
  if (status === 404) return `${operation} failed: API endpoint returned 404`;
  if (status === 401 || status === 403) return `${operation} failed: authentication is required`;
  if (status === 400 || status === 422) return `${operation} failed: request data was rejected (${status})`;
  if (status >= 500) return `${operation} failed: backend returned ${status}`;
  if (!error?.response) return `${operation} failed: backend is unreachable or the network is unavailable`;
  return `${operation} failed: HTTP ${status}`;
}

export async function syncLocalScan(scan) {
  const { data } = await api.post('/scans/local', {
    local: true,
    sourceType: 'image',
    provider: 'ML Kit',
    model: scan.model || 'On-device Text Recognition',
    title: scan.title,
    plainText: scan.plainText,
    markdown: scan.markdown,
    latex: scan.latex,
    blocks: scan.blocks,
    questions: scan.questions,
    warnings: scan.warnings,
  });
  return data.scan;
}
