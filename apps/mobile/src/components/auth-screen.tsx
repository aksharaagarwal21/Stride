import type { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, type } from '../theme';

/** Shared frame for login/register: keyboard-aware, scrollable, safe-area padded. */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + space.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image
            // Static image requires are how Metro bundles local assets.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.wordmark}>Stride</Text>
        </View>
        <Text style={type.title}>{title}</Text>
        <Text style={[type.bodyMuted, { marginTop: 4, marginBottom: space.xxl }]}>{subtitle}</Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: space.xl, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xxxl },
  logo: { width: 36, height: 36, borderRadius: 9 },
  wordmark: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
});
