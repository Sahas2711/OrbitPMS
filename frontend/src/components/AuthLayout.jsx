import { motion } from 'framer-motion';
import {
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineChartBarSquare,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';

const FEATURES = [
  { icon: HiOutlineCalendarDays, text: 'Smart booking & reservation management' },
  { icon: HiOutlineChartBarSquare, text: 'Real-time occupancy analytics' },
  { icon: HiOutlineShieldCheck, text: 'Enterprise-grade security & access control' },
];

export default function AuthLayout({ title, subtitle, children, compact = false }) {
  return (
    <div className="min-h-svh flex bg-bg-page">
      {/* ── Left Side: Branding & Features ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, rgba(37,99,235,0.15) 0%, transparent 50%)`,
          }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex flex-col justify-between p-12 w-full">
          {/* Brand */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/25">
                <HiOutlineBuildingOffice2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-card-title font-bold text-white m-0 leading-tight">OrbitPMS</h1>
                <p className="text-caption text-blue-300 m-0 leading-tight">Property Management System</p>
              </div>
            </motion.div>
          </div>

          {/* Center content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-display font-bold text-white m-0 leading-tight">
                Streamline Your
                <span className="text-brand-200 block">Hotel Operations</span>
              </h2>
              <p className="text-body text-blue-200 mt-4 max-w-md leading-relaxed">
                The all-in-one platform for managing reservations, rooms, guests, and staff — 
                designed for modern hospitality businesses.
              </p>
            </motion.div>

            {/* Feature list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-4"
            >
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-brand-200" />
                    </div>
                    <p className="text-small text-blue-200 m-0">{feature.text}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Security indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center gap-6 text-caption text-blue-300"
          >
            <div className="flex items-center gap-1.5">
              <HiOutlineLockClosed className="w-3.5 h-3.5" />
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HiOutlineShieldCheck className="w-3.5 h-3.5" />
              <span>SOC 2 compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-alert-success/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-alert-success" />
              </div>
              <span>99.9% uptime</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right Side: Auth Form ───────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
              <HiOutlineBuildingOffice2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-body font-bold text-text-primary m-0 leading-tight">OrbitPMS</h1>
              <p className="text-caption text-text-muted m-0 leading-tight">Property Management</p>
            </div>
          </div>

          {/* Auth Card */}
          <div className={compact ? '' : 'bg-bg-card rounded-card shadow-card border border-border p-8'}>
            <div className="mb-6">
              <h2 className="text-section-title font-bold text-text-primary m-0">{title}</h2>
              {subtitle && (
                <p className="text-small text-text-secondary mt-1.5">{subtitle}</p>
              )}
            </div>

            {children}
          </div>

          {/* Footer */}
          <p className="text-caption text-text-muted text-center mt-6">
            &copy; {new Date().getFullYear()} OrbitPMS. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
