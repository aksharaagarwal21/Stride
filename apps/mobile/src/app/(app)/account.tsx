import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { formatTimestamp } from '@stride/shared';
import { Button, Card } from '../../components/ui';
import { API_URL } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, space, type } from '../../theme';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')
  ).toUpperCase();
}

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  function confirmLogout() {
    Alert.alert(
      'Sign out of Stride?',
      'You can sign back in with the same account on any device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await logout(); // Always clears this device; the root navigator then shows login.
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user ? initials(user.fullName) : '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.subheading} numberOfLines={2}>
            {user?.fullName}
          </Text>
          <Text style={type.bodyMuted} numberOfLines={1}>
            {user?.email}
          </Text>
          {user ? (
            <Text style={type.small}>Member since {formatTimestamp(user.createdAt)}</Text>
          ) : null}
        </View>
      </Card>
      <Text style={type.bodyMuted}>
        Your sign-in is stored encrypted on this device (Android Keystore). Projects and tasks are
        the same ones you see on the web — pull down on any list to refresh.
      </Text>
      <Button label="Sign out" icon="log-out" onPress={confirmLogout} loading={signingOut} />
      <Text style={styles.footer}>
        Stride {Constants.expoConfig?.version ?? ''} · {API_URL}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primaryStrong },
  footer: { fontSize: 12, color: colors.ink3, textAlign: 'center' },
});
