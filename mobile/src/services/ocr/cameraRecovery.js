import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const CAMERA_PENDING_KEY = '@mathlens/camera-pending';

/**
 * On Android the system camera runs in another app. When memory is tight the OS
 * kills this app in the background, and when the photo is confirmed the app is
 * started again from scratch, which looks like a crash/restart and loses the photo.
 * We note that a capture is in progress so the next launch can recover the result.
 */
export async function markCameraPending() {
  if (Platform.OS !== 'android') return;
  try { await AsyncStorage.setItem(CAMERA_PENDING_KEY, String(Date.now())); } catch { /* best effort */ }
}

export async function clearCameraPending() {
  try { await AsyncStorage.removeItem(CAMERA_PENDING_KEY); } catch { /* best effort */ }
}

/** Returns the captured image asset that was lost to an app restart, or null. */
export async function recoverPendingCameraPhoto() {
  if (Platform.OS !== 'android') return null;
  let startedAt;
  try { startedAt = await AsyncStorage.getItem(CAMERA_PENDING_KEY); } catch { return null; }
  if (!startedAt) return null;
  // Always consume the flag so a stale one can never trigger twice.
  await clearCameraPending();
  // Ignore very old flags (the user abandoned that capture long ago).
  if (Date.now() - Number(startedAt) > 30 * 60 * 1000) return null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    // Depending on the library version this is a single result or a list of them.
    const results = Array.isArray(pending) ? pending : [pending];
    for (const result of results) {
      if (result && !result.canceled && !result.code && result.assets?.length) return result.assets[0];
    }
  } catch (error) {
    console.warn('[camera] Could not recover pending photo:', error?.message || error);
  }
  return null;
}