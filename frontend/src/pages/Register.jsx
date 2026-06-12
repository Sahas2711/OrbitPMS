import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';

import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { registerUser } from '../services/api';

const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'admin', label: 'Admin' },
];

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
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
    return PASSWORD_REQUIREMENTS.filter((req) => req.test(pass)).length;
  };

  const strength = getPasswordStrength(passwordValue || '');

  const strengthConfig = {
    0: { color: 'bg-border', label: '', textColor: '' },
    1: { color: 'bg-alert-error', label: 'Weak', textColor: 'text-alert-error' },
    2: { color: 'bg-orange-500', label: 'Fair', textColor: 'text-orange-500' },
    3: { color: 'bg-yellow-500', label: 'Good', textColor: 'text-yellow-500' },
    4: { color: 'bg-lime-500', label: 'Strong', textColor: 'text-lime-600' },
    5: { color: 'bg-alert-success', label: 'Very Strong', textColor: 'text-alert-success' },
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

        {/* Full Name */}
        <div>
          <label className="block text-small font-medium text-text-secondary mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={loading}
              className={`w-full h-[48px] pl-10 pr-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.fullName
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
              {...register('fullName', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Name must be under 100 characters' },
              })}
            />
          </div>
          {errors.fullName && (
            <p className="mt-1.5 text-caption text-alert-error">{errors.fullName.message}</p>
          )}
        </div>

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
          <label className="block text-small font-medium text-text-secondary mb-1.5">
            Password
          </label>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={loading}
              className={`w-full h-[48px] pl-10 pr-11 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.password
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                validate: {
                  hasUppercase: (v) => /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                  hasLowercase: (v) => /[a-z]/.test(v) || 'Must contain at least one lowercase letter',
                  hasDigit: (v) => /[0-9]/.test(v) || 'Must contain at least one digit',
                },
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

          {/* Password Strength */}
          {passwordValue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-2"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      level <= strength ? strengthConfig[strength].color : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-caption text-text-muted">
                  Password strength:{' '}
                  <span className={`font-semibold ${strengthConfig[strength].textColor}`}>
                    {strengthConfig[strength].label || 'Too weak'}
                  </span>
                </p>
                <p className="text-caption text-text-muted">{strength}/5</p>
              </div>

              {/* Requirements checklist */}
              <div className="space-y-1">
                {PASSWORD_REQUIREMENTS.map((req, i) => {
                  const met = req.test(passwordValue);
                  return (
                    <div key={i} className="flex items-center gap-2 text-caption">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                          met ? 'bg-alert-success/20' : 'bg-bg-table-header'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            met ? 'bg-alert-success' : 'bg-text-muted'
                          }`}
                        />
                      </div>
                      <span className={met ? 'text-alert-success' : 'text-text-muted'}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {errors.password && (
            <p className="mt-1.5 text-caption text-alert-error">{errors.password.message}</p>
          )}
        </div>

        {/* Role Selector */}
        <div>
          <label className="block text-small font-medium text-text-secondary mb-1.5">
            Role
          </label>
          <select
            disabled={loading}
            className="w-full h-[48px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            {...register('role', { required: 'Role is required' })}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <Button type="submit" loading={loading} className="w-full !h-[48px] !text-body">
          Create Account
        </Button>

        {/* Login Link */}
        <p className="text-center text-small text-text-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand font-semibold hover:text-brand-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
