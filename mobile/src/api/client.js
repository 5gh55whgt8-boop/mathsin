import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const productionApiUrl = 'https://mathlens-ai-api-bhasker.onrender.com/api';
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
  if (status === 413) return `${operation} failed because the file is too large. Choose an image smaller than 20 MB.`;
  if (status === 408 || error?.code === 'ECONNABORTED') return `${operation} took too long. Please try a smaller image or try again.`;
  if (status === 404) {
    return operation.toLowerCase().includes('sync')
      ? 'The connected API does not support scan synchronization. Reinstall the latest app build and redeploy the latest MathLens API, then try again.'
      : operation.toLowerCase().includes('pdf')
        ? 'PDF creation is not available on the connected server. Update the app or redeploy the latest MathLens API, then try again.'
      : `${operation} failed because the requested item was not found.`;
  }
  if (status === 401 || status === 403) return `${operation} failed: authentication is required`;
  if (status === 402) return `${operation} failed: the connected API still has the old scan limit enabled. Redeploy the latest backend and try again.`;
  if (status === 400 || status === 422) return `${operation} failed: request data was rejected (${status})`;
  if (status >= 500) return `${operation} failed: backend returned ${status}`;
  if (!error?.response) return `${operation} failed: backend is unreachable or the network is unavailable`;
  return `${operation} failed: HTTP ${status}`;
}

const PENDING_LOCAL_SCANS_KEY = '@mathlens/pending-local-scans';

function syncId(scan) {
  return scan.localSyncId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readPendingLocalScans() {
  const raw = await AsyncStorage.getItem(PENDING_LOCAL_SCANS_KEY);
  if (!raw) return [];
  try {
    const scans = JSON.parse(raw);
    return Array.isArray(scans) ? scans : [];
  } catch {
    await AsyncStorage.removeItem(PENDING_LOCAL_SCANS_KEY);
    return [];
  }
}

export async function queueLocalScan(scan) {
  const queued = { ...scan, localSyncId: syncId(scan) };
  const scans = await readPendingLocalScans();
  const next = scans.filter(item => item.localSyncId !== queued.localSyncId);
  next.push(queued);
  await AsyncStorage.setItem(PENDING_LOCAL_SCANS_KEY, JSON.stringify(next.slice(-50)));
  return queued;
}

async function removeQueuedLocalScan(localSyncId) {
  const scans = await readPendingLocalScans();
  const next = scans.filter(item => item.localSyncId !== localSyncId);
  if (next.length) await AsyncStorage.setItem(PENDING_LOCAL_SCANS_KEY, JSON.stringify(next));
  else await AsyncStorage.removeItem(PENDING_LOCAL_SCANS_KEY);
}

function retryableSyncError(error) {
  const status = error?.response?.status;
  return !error?.response || status === 408 || status === 429 || status >= 500;
}

export async function syncLocalScan(scan, { queueOnFailure = true } = {}) {
  const queued = await queueLocalScan(scan);
  const payload = {
    local: true,
    sourceType: 'image',
    provider: 'ML Kit',
    model: queued.model || 'On-device Text Recognition',
    title: queued.title,
    plainText: queued.plainText,
    markdown: queued.markdown,
    latex: queued.latex,
    blocks: queued.blocks,
    questions: queued.questions,
    warnings: queued.warnings,
    localSyncId: queued.localSyncId,
  };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data } = await api.post('/scans/local', payload);
      await removeQueuedLocalScan(queued.localSyncId);
      return data.scan;
    } catch (error) {
      lastError = error;
      if (!retryableSyncError(error) || attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  lastError.localSyncId = queued.localSyncId;
  throw lastError;
}

export async function flushPendingLocalScans() {
  const pending = await readPendingLocalScans();
  for (const scan of pending) {
    try {
      await syncLocalScan(scan, { queueOnFailure: false });
    } catch (error) {
      if (!retryableSyncError(error)) break;
      break;
    }
  }
}
