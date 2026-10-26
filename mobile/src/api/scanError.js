export function scanErrorMessage(error) {
  const data = error.response?.data;
  const code = data?.code;
  if (code === 'SUBSCRIPTION_REQUIRED' || error.response?.status === 402) {
    return { title: 'Free trial finished', message: 'Your free scans or trial period have ended. Open Subscription to continue, or ask your administrator to extend the trial.' };
  }
  if (code === 'OCR_PROVIDER_QUOTA') {
    return { title: 'Scanner provider is busy', message: 'The AI provider has reached its capacity, not your account scan limit. This failed scan has not used a free scan. Please try again later; if this continues, contact support.' };
  }
  if (['OCR_PROVIDER_UNAVAILABLE', 'OCR_CONNECTION'].includes(code)) {
    return { title: 'Scanner temporarily unavailable', message: 'The recognition provider could not complete this request. This failed scan has not used a free scan. Keep your file selected and try again shortly.' };
  }
  if (!error.response || ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) {
    return { title: 'Connection interrupted', message: 'We could not confirm the scan result. Check History before retrying—the server may have saved it. Make sure you are online.' };
  }
  return { title: 'Scan failed', message: data?.error || 'Unable to scan this file. Please try again.' };
}
