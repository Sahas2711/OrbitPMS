import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';

import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Invalid email or password. Please try again.';
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
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-input bg-red-50 border border-alert-error/20 flex items-start gap-2.5"
          >
            <div className="w-5 h-5 rounded-full bg-alert-error/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-caption font-bold text-alert-error">!</span>
            </div>
            <p className="text-small text-alert-error m-0">{serverError}</p>
          </motion.div>
        )}

        {/* Email */}
        <div>
          <label className="block text-small font-medium text-text-secondary mb-1.5">
            Email address
          </label>
          <div className="relative">
            <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              className={`w-full h-[48px] pl-10 pr-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.email
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-caption text-alert-error">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-small font-medium text-text-secondary">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-caption font-medium text-brand hover:text-brand-hover transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              className={`w-full h-[48px] pl-10 pr-11 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.password
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
              {...register('password', {
                required: 'Password is required',
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-0.5"
              tabIndex={-1}
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="w-5 h-5" />
              ) : (
                <HiOutlineEye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-caption text-alert-error">{errors.password.message}</p>
          )}
        </div>


        {/* Submit */}
        <Button type="submit" loading={loading} className="w-full !h-[48px] !text-body">
          Sign in
        </Button>

        {/* Register Link */}
        <p className="text-center text-small text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-brand font-semibold hover:text-brand-hover transition-colors"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
