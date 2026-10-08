import { Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, shadow, space } from '../theme';

/** Floating primary action, kept clear of the tab bar / gesture area by its parent's padding. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryStrong }]}
    >
      <Feather name="plus" size={20} color="#fff" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    ...shadow.card,
    elevation: 4,
  },
  label: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
