import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';

import Input from '../components/Input';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { registerUser } from '../services/api';

const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'admin', label: 'Admin' },
];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'staff',
    },
  });

  const passwordValue = watch('password');

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(passwordValue || '');

  const strengthColors = {
    0: 'bg-border',
    1: 'bg-alert-error',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-lime-500',
    5: 'bg-alert-success',
  };

  const strengthLabels = {
    0: '',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
    5: 'Very Strong',
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      await registerUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'object' && detail?.message
          ? detail.message
          : typeof detail === 'string'
            ? detail
            : 'An unexpected error occurred. Please try again.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join OrbitPMS to manage your property"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Server Error */}
        {serverError && (
          <div className="p-3 rounded-input bg-red-50 border border-alert-error/20">
            <p className="text-small text-alert-error m-0">{serverError}</p>
          </div>
        )}

        {/* Full Name */}
        <Input
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          icon={HiOutlineUser}
          error={errors.fullName?.message}
          disabled={loading}
          {...register('fullName', {
            required: 'Full name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters',
            },
            maxLength: {
              value: 100,
              message: 'Name must be under 100 characters',
            },
          })}
        />

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
        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              icon={HiOutlineLockClosed}
              error={errors.password?.message}
              disabled={loading}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                validate: {
                  hasUppercase: (v) =>
                    /[A-Z]/.test(v) ||
                    'Must contain at least one uppercase letter',
                  hasLowercase: (v) =>
                    /[a-z]/.test(v) ||
                    'Must contain at least one lowercase letter',
                  hasDigit: (v) =>
                    /[0-9]/.test(v) || 'Must contain at least one digit',
                },
              })}
              inputClassName="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-text-muted hover:text-text-secondary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="w-5 h-5" />
              ) : (
                <HiOutlineEye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {passwordValue && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                      level <= strength
                        ? strengthColors[strength]
                        : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <p className="text-caption text-text-muted">
                Password strength:{' '}
                <span
                  className={`font-medium ${
                    strength >= 4
                      ? 'text-alert-success'
                      : strength >= 3
                        ? 'text-yellow-500'
                        : 'text-alert-error'
                  }`}
                >
                  {strengthLabels[strength]}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Role Selector */}
        <div className="w-full">
          <label className="block text-small font-medium text-text-secondary mb-1.5">
            Role
          </label>
          <select
            disabled={loading}
            className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
            {...register('role', { required: 'Role is required' })}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <Button type="submit" loading={loading} className="w-full">
          Create Account
        </Button>

        {/* Login Link */}
        <p className="text-center text-small text-text-secondary mt-4">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand font-medium hover:text-brand-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
