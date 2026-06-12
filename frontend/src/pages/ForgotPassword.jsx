import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineEnvelope,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';

import Button from '../components/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSent(true);
    } catch {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex bg-bg-page">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
          }} />
        </div>
        <div className="relative text-center p-12">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand/25">
            <HiOutlineBuildingOffice2 className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-display font-bold text-white m-0">Reset Your Password</h2>
          <p className="text-body text-blue-200 mt-3 max-w-md mx-auto">
            Enter your email and we'll send you a link to reset your password. 
            Secure and fast — usually takes less than a minute.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile brand */}
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
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-bg-card rounded-card shadow-card border border-border p-8"
              >
                <div className="mb-6">
                  <h2 className="text-section-title font-bold text-text-primary m-0">Forgot password?</h2>
                  <p className="text-small text-text-secondary mt-1.5">
                    No worries. Enter your email and we'll send you a reset link.
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

                  <div>
                    <label className="block text-small font-medium text-text-secondary mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        disabled={loading}
                        className="w-full h-[48px] pl-10 pr-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button type="submit" loading={loading} className="w-full !h-[48px] !text-body">
                    Send Reset Link
                  </Button>

                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 text-small text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <HiOutlineArrowLeft className="w-4 h-4" />
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
                <h2 className="text-card-title font-bold text-text-primary m-0">Check your email</h2>
                <p className="text-small text-text-secondary mt-2 leading-relaxed">
                  We've sent a password reset link to{' '}
                  <span className="font-semibold text-text-primary">{email}</span>
                </p>
                <div className="mt-6 p-4 rounded-input bg-brand-50 border border-brand-100">
                  <p className="text-caption text-text-secondary m-0">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => { setSent(false); setLoading(false); }}
                      className="text-brand font-medium hover:text-brand-hover transition-colors bg-transparent border-none p-0 cursor-pointer"
                    >
                      try a different email
                    </button>
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 mt-6 text-small text-text-secondary hover:text-text-primary transition-colors"
                >
                  <HiOutlineArrowLeft className="w-4 h-4" />
                  Back to sign in
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
