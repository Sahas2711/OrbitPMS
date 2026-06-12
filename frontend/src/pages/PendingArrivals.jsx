import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowRightOnRectangle,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineCalendarDays,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';
import { format, isToday, isPast, parseISO } from 'date-fns';

import StatusBadge from '../components/StatusBadge';
import { getBookings, checkInBooking } from '../services/api';

export default function PendingArrivals() {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkingIn, setCheckingIn] = useState({});
  const [recentlyCheckedIn, setRecentlyCheckedIn] = useState(new Set());

  const fetchArrivals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookings({ status: 'confirmed', limit: 200 });
      setAllBookings(data);
    } catch {
      toast.error('Failed to load arrivals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArrivals(); }, [fetchArrivals]);

  const filtered = allBookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guest_name?.toLowerCase().includes(q) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.room_number && b.room_number.toLowerCase().includes(q))
    );
  });

  const todayArrivals = filtered.filter((b) => {
    try { return isToday(parseISO(b.check_in_date)); } catch { return false; }
  });

  const overdueArrivals = filtered.filter((b) => {
    try { return isPast(parseISO(b.check_in_date)) && !isToday(parseISO(b.check_in_date)); } catch { return false; }
  });

  const upcomingArrivals = filtered.filter((b) => {
    try { return !isPast(parseISO(b.check_in_date)) && !isToday(parseISO(b.check_in_date)); } catch { return false; }
  });

  const handleCheckIn = async (booking) => {
    setCheckingIn((prev) => ({ ...prev, [booking.id]: true }));
    try {
      await checkInBooking(booking.id);
      setRecentlyCheckedIn((prev) => new Set(prev).add(booking.id));
      toast.success(`${booking.guest_name} checked in!`);
      setTimeout(() => {
        setAllBookings((prev) => prev.filter((b) => b.id !== booking.id));
        setRecentlyCheckedIn((prev) => { const n = new Set(prev); n.delete(booking.id); return n; });
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to check in';
      toast.error(msg);
    } finally {
      setCheckingIn((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  const renderCard = (booking) => {
    const isCheckingIn = checkingIn[booking.id];
    const isDone = recentlyCheckedIn.has(booking.id);
    const arrivalDate = (() => { try { return parseISO(booking.check_in_date); } catch { return null; } })();

    return (
      <motion.div
        key={booking.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`bg-bg-card rounded-card border transition-all duration-500 ${
          isDone ? 'border-alert-success/50 bg-alert-success/5 opacity-60 scale-[0.97]' : 'border-border shadow-card hover:shadow-hover'
        }`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                isDone ? 'bg-alert-success/20' : 'bg-brand-50'
              }`}>
                {isDone ? (
                  <HiOutlineCheckCircle className="w-5 h-5 text-alert-success" />
                ) : (
                  <HiOutlineUser className="w-5 h-5 text-brand" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-body font-semibold m-0 truncate ${isDone ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                  {booking.guest_name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-small text-text-muted flex items-center gap-1">
                    <HiOutlineBuildingOffice2 className="w-3.5 h-3.5" />
                    Room {booking.room_number || '—'}
                    {booking.room_type && <span className="capitalize">({booking.room_type})</span>}
                  </span>
                  {arrivalDate && (
                    <span className={`text-small flex items-center gap-1 ${
                      isToday(arrivalDate) ? 'text-alert-success font-medium' :
                      isPast(arrivalDate) ? 'text-alert-error font-medium' : 'text-text-muted'
                    }`}>
                      {isToday(arrivalDate) ? <HiOutlineClock className="w-3.5 h-3.5" /> :
                       isPast(arrivalDate) ? <HiOutlineExclamationTriangle className="w-3.5 h-3.5" /> :
                       <HiOutlineCalendarDays className="w-3.5 h-3.5" />}
                      {format(arrivalDate, 'MMM d')}
                      {isToday(arrivalDate) && ' — Today'}
                      {isPast(arrivalDate) && !isToday(arrivalDate) && ' — Overdue'}
                    </span>
                  )}
                </div>
                {(booking.guest_email || booking.guest_phone) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {booking.guest_email && (
                      <span className="text-caption text-text-muted flex items-center gap-1">
                        <HiOutlineEnvelope className="w-3 h-3" />{booking.guest_email}
                      </span>
                    )}
                    {booking.guest_phone && (
                      <span className="text-caption text-text-muted flex items-center gap-1">
                        <HiOutlinePhone className="w-3 h-3" />{booking.guest_phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <StatusBadge status={booking.booking_status} size="sm" />
          </div>

          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
            <div className="text-small text-text-secondary">
              <span className="text-text-muted">Check-out: </span>
              <span className="font-medium text-text-primary">
                {(() => { try { return format(parseISO(booking.check_out_date), 'MMM d, yyyy'); } catch { return booking.check_out_date; }})()}
              </span>
            </div>
            <button
              onClick={() => handleCheckIn(booking)}
              disabled={isCheckingIn || isDone}
              className={`h-[36px] px-4 rounded-button text-small font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                isDone ? 'bg-alert-success/10 text-alert-success cursor-default' :
                'bg-brand text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isCheckingIn ? (
                <><LuLoader className="w-4 h-4 animate-spin" />Checking in...</>
              ) : isDone ? (
                <><HiOutlineCheckCircle className="w-4 h-4" />Checked In</>
              ) : (
                <><HiOutlineArrowRightOnRectangle className="w-4 h-4" />Check In</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title, icon, bookings, accentClass) => {
    if (bookings.length === 0) return null;
    return (
      <div className="mb-8">
        <div className={`flex items-center gap-2 mb-4 ${accentClass}`}>
          {icon}
          <h3 className="text-card-title font-semibold m-0">{title}</h3>
          <span className="text-small text-text-muted ml-1">({bookings.length})</span>
        </div>
        <div className="space-y-3">
          {bookings.map(renderCard)}
        </div>
      </div>
    );
  };

  const hasAll = todayArrivals.length > 0 || overdueArrivals.length > 0 || upcomingArrivals.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-section-title font-bold text-text-primary m-0">Check-In</h2>
        <p className="text-body text-text-secondary mt-1">View and manage guests scheduled to arrive</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search by guest name, email, or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[40px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-bg-card rounded-card border border-border p-4">
          <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Today</p>
          <p className="text-section-title font-bold text-alert-success m-0 mt-1">{loading ? '...' : todayArrivals.length}</p>
        </div>
        <div className="bg-bg-card rounded-card border border-border p-4">
          <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Overdue</p>
          <p className="text-section-title font-bold text-alert-error m-0 mt-1">{loading ? '...' : overdueArrivals.length}</p>
        </div>
        <div className="bg-bg-card rounded-card border border-border p-4">
          <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Upcoming</p>
          <p className="text-section-title font-bold text-text-primary m-0 mt-1">{loading ? '...' : upcomingArrivals.length}</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LuLoader className="w-8 h-8 text-brand animate-spin" />
          <p className="text-small text-text-muted mt-3">Loading arrivals...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !hasAll && (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-card rounded-card border border-border">
          <HiOutlineCheckCircle className="w-12 h-12 text-alert-success mb-4" />
          <h3 className="text-card-title font-semibold text-text-primary m-0">All clear!</h3>
          <p className="text-body text-text-secondary mt-2 text-center max-w-sm">
            {search ? 'No arrivals match your search.' : 'No pending arrivals.'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-small text-brand hover:text-brand-hover font-medium">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Sections */}
      {!loading && hasAll && (
        <>
          {renderSection('Arriving Today', <HiOutlineClock className="w-5 h-5 text-alert-success" />, todayArrivals, 'text-alert-success')}
          {renderSection('Overdue Arrivals', <HiOutlineExclamationTriangle className="w-5 h-5 text-alert-error" />, overdueArrivals, 'text-alert-error')}
          {renderSection('Upcoming Arrivals', <HiOutlineCalendarDays className="w-5 h-5 text-text-muted" />, upcomingArrivals, 'text-text-muted')}
        </>
      )}
    </div>
  );
}
