import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LIMITS, registerSchema, type RegisterInput } from '@stride/shared';
import { AuthScreen } from '../../components/auth-screen';
import { Button, FormError, PasswordField, TextField } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { colors, space, type } from '../../theme';

export default function RegisterScreen() {
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAccount(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fullName', 'email', 'password']));
    }
  });

  return (
    <AuthScreen
      title="Create your account"
      subtitle="One account for Stride on the web and on Android."
    >
      <View style={styles.form}>
        <FormError message={formError} />
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <TextField
              label="Full name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.fullName?.message}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />
          )}
        />
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
              hint={`At least ${LIMITS.passwordMin} characters.`}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          )}
        />
        <Button
          label={isSubmitting ? 'Creating account' : 'Create account'}
          variant="primary"
          onPress={submit}
          loading={isSubmitting}
        />
        <Text style={[type.bodyMuted, styles.switch]}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  switch: { textAlign: 'center', marginTop: space.sm },
  link: { color: colors.primary, fontWeight: '600' },
});
