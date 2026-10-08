import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../theme';

/** True only when the device reports no connection (unknown counts as online). */
export function useIsOffline() {
  const { isConnected } = useNetInfo();
  return isConnected === false;
}

/**
 * Shown above content while offline. Data already on screen is labelled as cached; edits are
 * not queued, so the banner says plainly that changes cannot be saved until reconnecting.
 */
export function OfflineBanner({ hasData }: { hasData: boolean }) {
  const offline = useIsOffline();
  const queryClient = useQueryClient();
  if (!offline) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Feather name="wifi-off" size={16} color={colors.warning} />
      <Text style={styles.text}>
        {hasData
          ? "You're offline. Showing cached data — changes can't be saved until you reconnect."
          : "You're offline. Connect to load your data."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={() => void queryClient.refetchQueries({ type: 'active' })}
        style={styles.retry}
        hitSlop={8}
      >
        <Text style={styles.retryLabel}>Retry</Text>
      </Pressable>
    </View>
  );
}

/** "Updated 10:42" — only shown for a fetch that actually succeeded. */
export function LastUpdated({ at }: { at: number }) {
  if (!at) return null;
  const time = new Date(at);
  const label = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  return <Text style={styles.updated}>Last refreshed {label}</Text>;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: '#F3DDBF',
  },
  text: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.warning },
  retry: { minHeight: 32, justifyContent: 'center', paddingHorizontal: space.sm },
  retryLabel: { fontSize: 13, fontWeight: '700', color: colors.warning },
  updated: { fontSize: 12, color: colors.ink3 },
});
