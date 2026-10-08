import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { isApiError } from '@stride/shared';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Requests are always attempted (not paused) so an offline fetch fails quickly with a
      // clear "offline" error instead of spinning. Only transport failures are retried.
      networkMode: 'always',
      retry: (count, error) => isApiError(error) && error.isNetworkError && count < 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
    // Creates/updates are never retried automatically, so nothing is saved twice.
    mutations: { networkMode: 'always', retry: false },
  },
});

let wired = false;

/** Refetch when connectivity returns and when the app comes back to the foreground. */
export function wireQueryLifecycle() {
  if (wired) return;
  wired = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
  AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
}
