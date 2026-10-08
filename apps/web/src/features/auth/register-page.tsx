import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { LIMITS, registerSchema, type RegisterInput } from '@stride/shared';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/button';
import { Field, Input, PasswordInput } from '../../components/ui/field';
import { InlineAlert } from '../../components/ui/states';
import { applyServerErrors } from '../../lib/form-errors';
import { AuthLayout } from './auth-layout';

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAccount(values); // <GuestOnly> then redirects to Overview.
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fullName', 'email', 'password']));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <Field label="Full name" error={errors.fullName?.message}>
          {(props) => <Input {...props} {...register('fullName')} autoComplete="name" autoFocus />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(props) => <Input {...props} {...register('email')} type="email" autoComplete="email" />}
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint={`At least ${LIMITS.passwordMin} characters.`}
        >
          {(props) => (
            <PasswordInput {...props} {...register('password')} autoComplete="new-password" />
          )}
        </Field>
        <Button type="submit" variant="primary" loading={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
