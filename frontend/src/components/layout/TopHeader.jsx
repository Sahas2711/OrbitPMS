import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
  HiOutlineBuildingOffice2,
  HiOutlineChevronDown,
  HiOutlineCommandLine,
} from 'react-icons/hi2';

export default function TopHeader({ collapsed, sidebarWidth, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const cmdRef = useRef(null);

  // ── Keyboard shortcuts ──────────────────────────────────────

  useEffect(() => {
    const handleKey = (e) => {
      // Ctrl+K or Cmd+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Escape → close menus
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Close on click outside ──────────────────────────────────

  useEffect(() => {
    if (!notificationsOpen && !userMenuOpen && !searchOpen) return;
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [notificationsOpen, userMenuOpen, searchOpen]);

  // ── Focus search input ──────────────────────────────────────

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  // ── Notifications (mock) ─────────────────────────────────────

  const notifications = [
    { id: 1, text: 'New booking from John Smith', time: '2 min ago', unread: true },
    { id: 2, text: 'Room 204 maintenance completed', time: '15 min ago', unread: true },
    { id: 3, text: 'Check-out pending for Room 101', time: '1 hour ago', unread: false },
    { id: 4, text: 'Invoice #INV-0042 generated', time: '2 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  // ── Command palette items ────────────────────────────────────

  const commandItems = [
    { label: 'Go to Dashboard', action: () => navigate('/dashboard'), shortcut: 'G D' },
    { label: 'Go to Rooms', action: () => navigate('/rooms'), shortcut: 'G R' },
    { label: 'Go to Bookings', action: () => navigate('/bookings'), shortcut: 'G B' },
    { label: 'Go to Check-In', action: () => navigate('/arrivals'), shortcut: 'G I' },
    { label: 'Go to Check-Out', action: () => navigate('/checkout'), shortcut: 'G O' },
    { label: 'Go to Settings', action: () => navigate('/settings'), shortcut: 'G S' },
    { label: 'Toggle Sidebar', action: () => onMenuClick?.(), shortcut: 'Ctrl+B' },
    { label: 'Logout', action: () => logout(), shortcut: '' },
  ];

  const [cmdFilter, setCmdFilter] = useState('');
  const filteredCmd = commandItems.filter((item) =>
    item.label.toLowerCase().includes(cmdFilter.toLowerCase())
  );

  // ── Get initials ─────────────────────────────────────────────

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleBadgeColor = {
    admin: 'bg-purple-500/20 text-purple-300',
    receptionist: 'bg-cyan-500/20 text-cyan-300',
    staff: 'bg-slate-500/20 text-slate-300',
  };

  return (
    <>
      <header
        className="fixed top-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 z-header transition-all duration-300"
        style={{ left: collapsed ? 80 : 280 }}
      >
        {/* Left: Mobile menu + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-table-header transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Global search trigger */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-bg-page text-text-muted hover:text-text-secondary hover:border-border-secondary transition-all text-small min-w-[240px]"
          >
            <HiOutlineMagnifyingGlass className="w-4 h-4" />
            <span>Search rooms, guests, bookings...</span>
            <span className="ml-auto flex items-center gap-1 text-caption text-text-muted bg-bg-card border border-border rounded px-1.5 py-0.5">
              <HiOutlineCommandLine className="w-3 h-3" />
              K
            </span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick action button */}
          <button
            onClick={() => navigate('/bookings')}
            className="hidden md:flex h-9 px-3 rounded-lg bg-brand text-white text-small font-medium hover:bg-brand-hover transition-all items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span>
            <span>New Booking</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative w-9 h-9 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-table-header transition-all flex items-center justify-center"
            >
              <HiOutlineBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-alert-error text-white text-caption font-bold flex items-center justify-center text-[9px] leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-bg-card rounded-card shadow-dropdown border border-border overflow-hidden z-dropdown"
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-small font-semibold text-text-primary m-0">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-caption text-brand font-medium cursor-pointer hover:text-brand-hover">Mark all read</span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-small text-text-muted">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-border/50 hover:bg-bg-table-header/50 transition-colors cursor-pointer ${
                            n.unread ? 'bg-brand-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {n.unread && <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />}
                            <div className={n.unread ? '' : 'ml-4'}>
                              <p className={`text-small m-0 ${n.unread ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                                {n.text}
                              </p>
                              <p className="text-caption text-text-muted mt-0.5">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border text-center">
                    <button className="text-caption text-brand font-medium hover:text-brand-hover transition-colors bg-transparent border-none p-0 cursor-pointer">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-lg hover:bg-bg-table-header transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-small font-semibold text-white shrink-0">
                {getInitials(user?.full_name)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-small font-medium text-text-primary m-0 leading-tight truncate max-w-[120px]">
                  {user?.full_name || 'User'}
                </p>
                <p className={`text-caption font-medium m-0 leading-tight capitalize ${roleBadgeColor[user?.role] || 'text-text-muted'}`}>
                  {user?.role || ''}
                </p>
              </div>
              <HiOutlineChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-bg-card rounded-card shadow-dropdown border border-border overflow-hidden z-dropdown"
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-small font-medium text-text-primary m-0">{user?.full_name || 'User'}</p>
                    <p className="text-caption text-text-muted m-0">{user?.email || ''}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-small text-text-secondary hover:bg-bg-table-header/50 hover:text-text-primary transition-colors"
                    >
                      <HiOutlineCog6Tooth className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-small text-text-secondary hover:bg-bg-table-header/50 hover:text-text-primary transition-colors"
                    >
                      <HiOutlineUser className="w-4 h-4" />
                      Profile
                    </button>
                  </div>

                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-small text-alert-error hover:bg-red-50 transition-colors"
                    >
                      <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Search Overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-2xl mx-auto mt-16 sm:mt-24 px-4"
            >
              <div className="bg-bg-card rounded-card shadow-modal border border-border overflow-hidden">
                <div className="flex items-center px-4 border-b border-border">
                  <HiOutlineMagnifyingGlass className="w-5 h-5 text-text-muted shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search rooms, guests, bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-14 px-3 text-body bg-transparent border-none outline-none placeholder:text-text-muted"
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="text-caption text-text-muted bg-bg-table-header rounded px-2 py-1 hover:text-text-secondary transition-colors"
                  >
                    ESC
                  </button>
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  <div className="px-3 py-4 text-center text-small text-text-muted">
                    Start typing to search across rooms, guests, and bookings...
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Command Palette ───────────────────────────────────── */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-lg mx-auto mt-20 sm:mt-28 px-4"
            >
              <div className="bg-bg-card rounded-card shadow-modal border border-border overflow-hidden">
                <div className="flex items-center px-4 border-b border-border">
                  <HiOutlineCommandLine className="w-5 h-5 text-text-muted shrink-0" />
                  <input
                    ref={cmdRef}
                    type="text"
                    placeholder="Type a command..."
                    value={cmdFilter}
                    onChange={(e) => setCmdFilter(e.target.value)}
                    className="flex-1 h-12 px-3 text-body bg-transparent border-none outline-none placeholder:text-text-muted"
                    autoFocus
                  />
                  <button
                    onClick={() => setCommandPaletteOpen(false)}
                    className="text-caption text-text-muted bg-bg-table-header rounded px-2 py-1 hover:text-text-secondary transition-colors"
                  >
                    ESC
                  </button>
                </div>
                <div className="p-2 max-h-72 overflow-y-auto">
                  {filteredCmd.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        setCmdFilter('');
                        item.action();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-button text-small text-text-secondary hover:bg-brand-50 hover:text-text-primary transition-colors"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-caption text-text-muted bg-bg-table-header rounded px-1.5 py-0.5 font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredCmd.length === 0 && (
                    <div className="px-3 py-6 text-center text-small text-text-muted">
                      No commands found for "{cmdFilter}"
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-caption text-text-muted bg-bg-page/50">
                  <span><kbd className="bg-bg-card border border-border rounded px-1 py-0.5 text-caption font-mono">↑↓</kbd> Navigate</span>
                  <span><kbd className="bg-bg-card border border-border rounded px-1 py-0.5 text-caption font-mono">↵</kbd> Select</span>
                  <span><kbd className="bg-bg-card border border-border rounded px-1 py-0.5 text-caption font-mono">Esc</kbd> Close</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
