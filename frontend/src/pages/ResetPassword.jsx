import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineKey,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';

import Button from '../components/Button';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const getStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(form.password);
  const strengthColors = ['bg-border', 'bg-alert-error', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-alert-success'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.password) {
      setError('Please enter a new password');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordsDontMatch = form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div className="min-h-svh flex bg-bg-page">
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
          }} />
        </div>
        <div className="relative text-center p-12">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand/25">
            <HiOutlineKey className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-display font-bold text-white m-0">Create New Password</h2>
          <p className="text-body text-blue-200 mt-3 max-w-md mx-auto">
            Your new password must be different from your previous password. 
            Make sure it's strong and secure.
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-[440px]"
        >
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <HiOutlineBuildingOffice2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-body font-bold text-text-primary m-0">OrbitPMS</h1>
              <p className="text-caption text-text-muted m-0">Property Management</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-bg-card rounded-card shadow-card border border-border p-8"
              >
                <div className="mb-6">
                  <h2 className="text-section-title font-bold text-text-primary m-0">Set new password</h2>
                  <p className="text-small text-text-secondary mt-1.5">
                    Must be at least 8 characters with uppercase, lowercase, and numbers.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-input bg-red-50 border border-alert-error/20"
                    >
                      <p className="text-small text-alert-error m-0">{error}</p>
                    </motion.div>
                  )}

                  {/* New Password */}
                  <div>
                    <label className="block text-small font-medium text-text-secondary mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        disabled={loading}
                        className="w-full h-[48px] pl-10 pr-11 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                      </button>
                    </div>

                    {form.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                level <= strength ? strengthColors[strength] : 'bg-border'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-caption text-text-muted">
                          Strength: <span className={`font-semibold ${
                            strength >= 4 ? 'text-alert-success' : strength >= 3 ? 'text-yellow-500' : 'text-alert-error'
                          }`}>{strengthLabels[strength] || 'Too weak'}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-small font-medium text-text-secondary mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={form.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        disabled={loading}
                        className={`w-full h-[48px] pl-10 pr-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 ${
                          passwordsDontMatch
                            ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                            : passwordsMatch
                              ? 'border-alert-success focus:ring-2 focus:ring-alert-success/20'
                              : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                        }`}
                      />
                    </div>
                    {passwordsDontMatch && (
                      <p className="mt-1.5 text-caption text-alert-error">Passwords do not match</p>
                    )}
                    {passwordsMatch && (
                      <p className="mt-1.5 text-caption text-alert-success">Passwords match</p>
                    )}
                  </div>

                  <Button type="submit" loading={loading} className="w-full !h-[48px] !text-body">
                    Reset Password
                  </Button>

                  <Link
                    to="/login"
                    className="block text-center text-small text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Back to sign in
                  </Link>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-bg-card rounded-card shadow-card border border-border p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-alert-success/10 flex items-center justify-center mx-auto mb-5">
                  <HiOutlineCheckCircle className="w-8 h-8 text-alert-success" />
                </div>
                <h2 className="text-card-title font-bold text-text-primary m-0">Password updated!</h2>
                <p className="text-small text-text-secondary mt-2">
                  Your password has been reset successfully. Redirecting you to sign in...
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center gap-2 h-[44px] px-6 rounded-button bg-brand text-white font-medium text-body hover:bg-brand-hover transition-all no-underline"
                >
                  Sign in with new password
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-caption text-text-muted text-center mt-6">
            &copy; {new Date().getFullYear()} OrbitPMS. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
