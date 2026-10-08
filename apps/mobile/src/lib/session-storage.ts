import * as SecureStore from 'expo-secure-store';
import type { User } from '@stride/shared';

// The bearer token is kept only in SecureStore, which encrypts it with a key held in the
// Android Keystore (iOS: Keychain). It is never written to AsyncStorage, logs or URLs.
// The user's public profile is stored alongside it so the app can open while offline.

const TOKEN_KEY = 'stride.session.token';
const USER_KEY = 'stride.session.user';

export interface StoredSession {
  token: string;
  user: User | null;
}

export async function readSession(): Promise<StoredSession | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
    const rawUser = await SecureStore.getItemAsync(USER_KEY);
    let user: User | null = null;
    try {
      user = rawUser ? (JSON.parse(rawUser) as User) : null;
    } catch {
      user = null;
    }
    return { token, user };
  } catch {
    // Unreadable storage (e.g. keys invalidated after a restore) means "signed out".
    return null;
  }
}

export async function writeSession(token: string, user: User): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
