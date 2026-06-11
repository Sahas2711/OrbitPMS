import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';

import Input from '../components/Input';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { loginUser } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      const result = await loginUser(data.email, data.password);

      // Store tokens
      if (result.tokens) {
        localStorage.setItem('access_token', result.tokens.access_token);
        localStorage.setItem('refresh_token', result.tokens.refresh_token);
      }

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'An unexpected error occurred. Please try again.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Server Error */}
        {serverError && (
          <div className="p-3 rounded-input bg-red-50 border border-alert-error/20">
            <p className="text-small text-alert-error m-0">{serverError}</p>
          </div>
        )}

        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          icon={HiOutlineEnvelope}
          error={errors.email?.message}
          disabled={loading}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />

        {/* Password */}
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          icon={HiOutlineLockClosed}
          error={errors.password?.message}
          disabled={loading}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
        />

        {/* Submit */}
        <Button type="submit" loading={loading} className="w-full">
          Sign In
        </Button>

        {/* Register Link */}
        <p className="text-center text-small text-text-secondary mt-4">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-brand font-medium hover:text-brand-hover transition-colors"
          >
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
