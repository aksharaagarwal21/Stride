import Constants from 'expo-constants';
import { createApiClient, type ApiError } from '@stride/shared';

/**
 * API origin. Release builds get EXPO_PUBLIC_API_URL from eas.json (the deployed HTTPS URL).
 * In development, if it is unset, we reuse the host the Expo dev server runs on, so a phone on
 * the same Wi-Fi reaches the API on that machine (localhost would point at the phone itself).
 */
function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && devHost) return `http://${devHost}:4000`;
  return 'http://10.0.2.2:4000';
}

export const API_URL = resolveApiUrl();

// The token lives in SecureStore; this in-memory copy avoids a keystore read per request.
let currentToken: string | null = null;
export function setApiToken(token: string | null) {
  currentToken = token;
}

type Listener = (error: ApiError) => void;
let unauthorizedListener: Listener | null = null;
export function setUnauthorizedListener(listener: Listener | null) {
  unauthorizedListener = listener;
}

export const api = createApiClient({
  baseUrl: API_URL,
  platform: 'mobile',
  getToken: () => currentToken,
  onUnauthorized: (error) => unauthorizedListener?.(error),
  timeoutMs: 15_000,
});
