import { Stack } from 'expo-router';
import { colors } from '../../theme';

export const unstable_settings = { initialRouteName: '(tabs)' };

// Detail and form screens push over the tabs with a native header and back button.
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="projects/[id]" options={{ title: 'Project' }} />
      <Stack.Screen name="projects/new" options={{ title: 'New project' }} />
      <Stack.Screen name="projects/edit" options={{ title: 'Edit project' }} />
      <Stack.Screen name="tasks/[id]" options={{ title: 'Task' }} />
      <Stack.Screen name="tasks/new" options={{ title: 'New task' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
    </Stack>
  );
}
