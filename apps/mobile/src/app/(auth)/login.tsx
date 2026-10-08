import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { loginSchema, type LoginInput } from '@stride/shared';
import { AuthScreen } from '../../components/auth-screen';
import { Button, FormError, Notice, PasswordField, TextField } from '../../components/ui';
import { API_URL } from '../../lib/api';
import { useAuth, type AuthNotice } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { colors, space, type } from '../../theme';

const NOTICES: Record<AuthNotice, { message: string; tone: 'info' | 'warning' }> = {
  expired: { message: 'Your session expired. Please sign in again.', tone: 'warning' },
  'signed-out': { message: 'You have been signed out.', tone: 'info' },
  'signed-out-offline': {
    message:
      "Signed out on this device. We couldn't reach the server, so the session will simply expire.",
    tone: 'warning',
  },
};

export default function LoginScreen() {
  const { login, notice } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values); // On success the root navigator swaps to the app.
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in with the same account you use on the web.">
      <View style={styles.form}>
        {notice && !formError ? (
          <Notice message={NOTICES[notice].message} tone={NOTICES[notice].tone} />
        ) : null}
        <FormError message={formError} />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <PasswordField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          )}
        />
        <Button
          label={isSubmitting ? 'Signing in' : 'Sign in'}
          variant="primary"
          onPress={submit}
          loading={isSubmitting}
        />
        <Text style={[type.bodyMuted, styles.switch]}>
          New to Stride?{' '}
          <Link href="/register" style={styles.link}>
            Create an account
          </Link>
        </Text>
      </View>
      <Text style={styles.server}>Server: {API_URL}</Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  switch: { textAlign: 'center', marginTop: space.sm },
  link: { color: colors.primary, fontWeight: '600' },
  server: {
    marginTop: 'auto',
    paddingTop: space.xxxl,
    textAlign: 'center',
    fontSize: 12,
    color: colors.ink3,
  },
});
