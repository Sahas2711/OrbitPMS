import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSquares2X2,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowRightOnRectangle,
  HiOutlineReceiptPercent,
  HiOutlineCalendar,
  HiOutlineBuildingOffice2,
  HiOutlineUsers,
  HiOutlineCog6Tooth,
  HiOutlineXMark,
  HiOutlineBars3,
} from 'react-icons/hi2';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineSquares2X2, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/rooms', label: 'Rooms', icon: HiOutlineBuildingOffice2, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/bookings', label: 'Bookings', icon: HiOutlineCalendarDays, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/arrivals', label: 'Check-In', icon: HiOutlineClipboardDocumentList, roles: ['admin', 'receptionist'] },
  { path: '/checkout', label: 'Check-Out', icon: HiOutlineArrowRightOnRectangle, roles: ['admin', 'receptionist'] },
  { path: '/invoices', label: 'Invoices', icon: HiOutlineReceiptPercent, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/availability', label: 'Calendar', icon: HiOutlineCalendar, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/users', label: 'Users', icon: HiOutlineUsers, roles: ['admin'] },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth, roles: ['admin', 'receptionist', 'staff'] },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarRef = useRef(null);

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const handleNavClick = useCallback((path) => {
    navigate(path);
    onMobileClose?.();
  }, [navigate, onMobileClose]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileOpen, onMobileClose]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-primary-800 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm shadow-brand/20">
          <HiOutlineBuildingOffice2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-small font-semibold text-white m-0 leading-tight">OrbitPMS</p>
            <p className="text-caption text-blue-300/60 m-0 leading-tight">Hotel Management</p>
          </div>
        )}
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <HiOutlineXMark className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-small font-medium transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-brand/15 text-white shadow-sm shadow-brand/5'
                  : 'text-slate-400 hover:bg-primary-800 hover:text-white'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-primary-800 p-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-small text-slate-400 hover:bg-primary-800 hover:text-white transition-all duration-150 cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-5 h-5 shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'} ${collapsed ? 'mx-auto' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full bg-primary-900 text-white hidden lg:flex flex-col transition-all duration-300 z-sidebar ${
          collapsed ? 'w-[80px]' : 'w-[280px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-[280px] h-full bg-primary-900 text-white flex flex-col"
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
