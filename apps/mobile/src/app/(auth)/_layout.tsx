import { Stack } from 'expo-router';
import { colors } from '../../theme';

// Signed-out users land on login (the protected app group redirects here).
export const unstable_settings = { initialRouteName: 'login' };

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
    />
  );
}
