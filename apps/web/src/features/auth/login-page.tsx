import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { loginSchema, type LoginInput } from '@stride/shared';
import { useAuth, type AuthNotice } from '../../auth/auth-context';
import { Button } from '../../components/ui/button';
import { Field, Input, PasswordInput } from '../../components/ui/field';
import { InlineAlert } from '../../components/ui/states';
import { applyServerErrors } from '../../lib/form-errors';
import { AuthLayout } from './auth-layout';

const NOTICES: Record<AuthNotice, string> = {
  expired: 'Your session expired. Please sign in again.',
  'signed-out': 'You have been signed out.',
};

export function LoginPage() {
  const { login, notice } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      // On success <GuestOnly> redirects to the page the user came from (or Overview).
      await login(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New to Stride?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {notice && !formError ? <InlineAlert tone="info">{NOTICES[notice]}</InlineAlert> : null}
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <Input {...props} {...register('email')} type="email" autoComplete="email" autoFocus />
          )}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(props) => (
            <PasswordInput {...props} {...register('password')} autoComplete="current-password" />
          )}
        </Field>
        <Button type="submit" variant="primary" loading={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
