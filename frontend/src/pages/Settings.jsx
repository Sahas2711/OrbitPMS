import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'profile', label: 'Profile', icon: HiOutlineUser },
  { id: 'security', label: 'Security', icon: HiOutlineLockClosed },
  { id: 'hotel', label: 'Hotel Settings', icon: HiOutlineBuildingOffice2 },
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Profile Form ──────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
  });

  // ── Security Form ─────────────────────────────────────────────
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ── Hotel Settings ────────────────────────────────────────────
  const [hotelSettings, setHotelSettings] = useState({
    hotelName: 'OrbitPMS Hotel',
    address: '123 Hospitality Lane',
    taxRate: '10',
    currency: 'USD',
  });

  const handleSave = async (section) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success(`${section} settings updated successfully`);
    setSaving(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-small font-medium text-text-secondary mb-1.5">Full Name</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-small font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-small font-medium text-text-secondary mb-1.5">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-table-header border border-border rounded-input outline-none cursor-not-allowed opacity-60 capitalize"
              />
            </div>
            <div className="pt-2">
              <Button onClick={() => handleSave('Profile')} loading={saving}>
                <HiOutlineCheckCircle className="w-5 h-5" />
                Save Changes
              </Button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-small font-medium text-text-secondary mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={securityForm.currentPassword}
                  onChange={(e) => setSecurityForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="w-full h-[44px] px-4 pr-10 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-small font-medium text-text-secondary mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={securityForm.newPassword}
                onChange={(e) => setSecurityForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="block text-small font-medium text-text-secondary mb-1.5">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={securityForm.confirmPassword}
                onChange={(e) => setSecurityForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button onClick={() => handleSave('Security')} loading={saving}>
                <HiOutlineShieldCheck className="w-5 h-5" />
                Update Password
              </Button>
            </div>
          </div>
        );

      case 'hotel':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Hotel Name</label>
                <input
                  type="text"
                  value={hotelSettings.hotelName}
                  onChange={(e) => setHotelSettings((p) => ({ ...p, hotelName: e.target.value }))}
                  className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Currency</label>
                <select
                  value={hotelSettings.currency}
                  onChange={(e) => setHotelSettings((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-small font-medium text-text-secondary mb-1.5">Address</label>
                <input
                  type="text"
                  value={hotelSettings.address}
                  onChange={(e) => setHotelSettings((p) => ({ ...p, address: e.target.value }))}
                  className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Tax Rate (%)</label>
                <input
                  type="number"
                  value={hotelSettings.taxRate}
                  onChange={(e) => setHotelSettings((p) => ({ ...p, taxRate: e.target.value }))}
                  className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={() => handleSave('Hotel')} loading={saving}>
                <HiOutlineCheckCircle className="w-5 h-5" />
                Save Hotel Settings
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-section-title font-bold text-text-primary m-0">Settings</h2>
        <p className="text-body text-text-secondary mt-1">Manage your account and system preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-56 shrink-0">
          <nav className="bg-bg-card rounded-card border border-border shadow-card overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-small font-medium transition-all text-left ${
                    isActive
                      ? 'bg-brand-50 text-brand border-r-2 border-brand'
                      : 'text-text-secondary hover:bg-bg-table-header/50 hover:text-text-primary border-r-2 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="bg-bg-card rounded-card border border-border shadow-card p-6"
            >
              <h3 className="text-card-title font-bold text-text-primary m-0 mb-5">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
