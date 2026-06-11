import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineBuildingOffice2,
  HiOutlineArrowRightOnRectangle,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineCalendarDays,
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

  // ── Fetch confirmed bookings ────────────────────────────────

  const fetchArrivals = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only confirmed bookings, no pagination limit (show all pending)
      const data = await getBookings({ status: 'confirmed', limit: 200 });
      setAllBookings(data);
    } catch {
      toast.error('Failed to load arrivals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArrivals();
  }, [fetchArrivals]);

  // ── Filter/search ───────────────────────────────────────────

  const filteredBookings = allBookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guest_name?.toLowerCase().includes(q) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.guest_phone && b.guest_phone.toLowerCase().includes(q)) ||
      (b.room_number && b.room_number.toLowerCase().includes(q))
    );
  });

  // ── Group arrivals ──────────────────────────────────────────

  const todayArrivals = filteredBookings.filter((b) => {
    try {
      return isToday(parseISO(b.check_in_date));
    } catch {
      return false;
    }
  });

  const overdueArrivals = filteredBookings.filter((b) => {
    try {
      const d = parseISO(b.check_in_date);
      return isPast(d) && !isToday(d);
    } catch {
      return false;
    }
  });

  const upcomingArrivals = filteredBookings.filter((b) => {
    try {
      return !isPast(parseISO(b.check_in_date)) && !isToday(parseISO(b.check_in_date));
    } catch {
      return false;
    }
  });

  // ── Check-in handler ────────────────────────────────────────

  const handleCheckIn = async (booking) => {
    setCheckingIn((prev) => ({ ...prev, [booking.id]: true }));
    try {
      await checkInBooking(booking.id);
      setRecentlyCheckedIn((prev) => new Set(prev).add(booking.id));
      toast.success(`${booking.guest_name} has been checked in!`);
      // Remove from the list after a brief pause for the visual feedback
      setTimeout(() => {
        setAllBookings((prev) => prev.filter((b) => b.id !== booking.id));
        setRecentlyCheckedIn((prev) => {
          const next = new Set(prev);
          next.delete(booking.id);
          return next;
        });
      }, 1200);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'object' && detail?.message
          ? detail.message
          : typeof detail === 'string'
            ? detail
            : 'Failed to check in guest. Please try again.';
      toast.error(message);
    } finally {
      setCheckingIn((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  // ── Render arrival card ─────────────────────────────────────

  const renderArrivalCard = (booking) => {
    const isCheckingIn = checkingIn[booking.id];
    const isDone = recentlyCheckedIn.has(booking.id);
    const arrivalDate = (() => {
      try {
        return parseISO(booking.check_in_date);
      } catch {
        return null;
      }
    })();

    return (
      <div
        key={booking.id}
        className={`bg-bg-card rounded-card border transition-all duration-500 ${
          isDone
            ? 'border-alert-success/50 bg-alert-success/5 opacity-60 scale-[0.97]'
            : 'border-border shadow-card hover:shadow-hover'
        }`}
      >
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isDone ? 'bg-alert-success/20' : 'bg-brand-light'
                }`}
              >
                {isDone ? (
                  <HiOutlineCheckCircle className="w-5 h-5 text-alert-success" />
                ) : (
                  <HiOutlineUser className="w-5 h-5 text-brand" />
                )}
              </div>
              <div className="min-w-0">
                <h4
                  className={`text-body font-semibold m-0 truncate ${
                    isDone ? 'text-text-secondary line-through' : 'text-text-primary'
                  }`}
                >
                  {booking.guest_name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-small text-text-muted flex items-center gap-1">
                    <HiOutlineBuildingOffice2 className="w-3.5 h-3.5" />
                    {booking.room_number || '—'}
                    {booking.room_type && (
                      <span className="capitalize">({booking.room_type})</span>
                    )}
                  </span>
                  {arrivalDate && (
                    <span
                      className={`text-small flex items-center gap-1 ${
                        isToday(arrivalDate)
                          ? 'text-alert-success font-medium'
                          : isPast(arrivalDate)
                            ? 'text-alert-error font-medium'
                            : 'text-text-muted'
                      }`}
                    >
                      {isToday(arrivalDate) ? (
                        <HiOutlineClock className="w-3.5 h-3.5" />
                      ) : isPast(arrivalDate) ? (
                        <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <HiOutlineClock className="w-3.5 h-3.5" />
                      )}
                      {format(arrivalDate, 'MMM d, yyyy')}
                      {isToday(arrivalDate) && ' — Today'}
                      {isPast(arrivalDate) && !isToday(arrivalDate) && ' — Overdue'}
                    </span>
                  )}
                </div>

                {/* Contact info */}
                {(booking.guest_email || booking.guest_phone) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {booking.guest_email && (
                      <span className="text-caption text-text-muted flex items-center gap-1">
                        <HiOutlineEnvelope className="w-3 h-3" />
                        {booking.guest_email}
                      </span>
                    )}
                    {booking.guest_phone && (
                      <span className="text-caption text-text-muted flex items-center gap-1">
                        <HiOutlinePhone className="w-3 h-3" />
                        {booking.guest_phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={booking.booking_status} />
            </div>
          </div>

          {/* Check-out + total row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
            <div className="text-small text-text-secondary">
              <span className="text-text-muted">Check-out: </span>
              <span className="text-text-primary font-medium">
                {(() => {
                  try {
                    return format(parseISO(booking.check_out_date), 'MMM d, yyyy');
                  } catch {
                    return booking.check_out_date;
                  }
                })()}
              </span>
              {booking.total_amount != null && (
                <span className="ml-3 text-text-muted">
                  Total: <span className="text-text-primary font-medium">${parseFloat(booking.total_amount).toFixed(2)}</span>
                </span>
              )}
            </div>

            <button
              onClick={() => handleCheckIn(booking)}
              disabled={isCheckingIn || isDone}
              className={`h-[36px] px-4 py-1.5 rounded-button text-small font-medium transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                isDone
                  ? 'bg-alert-success/10 text-alert-success cursor-default'
                  : 'bg-brand text-white hover:bg-brand-hover active:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isCheckingIn ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" />
                  Checking in...
                </>
              ) : isDone ? (
                <>
                  <HiOutlineCheckCircle className="w-4 h-4" />
                  Checked In
                </>
              ) : (
                <>
                  <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                  Check In
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Section renderer ────────────────────────────────────────

  const renderSection = (title, icon, bookings, accentColor) => {
    if (bookings.length === 0) return null;
    return (
      <div className="mb-8">
        <div className={`flex items-center gap-2 mb-4 ${accentColor}`}>
          {icon}
          <h3 className="text-card-title font-semibold m-0">{title}</h3>
          <span className="text-small text-text-muted ml-1">({bookings.length})</span>
        </div>
        <div className="space-y-3">
          {bookings.map(renderArrivalCard)}
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────

  const hasAll = todayArrivals.length > 0 || overdueArrivals.length > 0 || upcomingArrivals.length > 0;

  return (
    <div className="min-h-svh bg-bg-page">
      <header className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HiOutlineBuildingOffice2 className="w-6 h-6 text-brand" />
          <h1 className="text-card-title font-semibold m-0">OrbitPMS</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-section-title font-bold text-text-primary m-0">Pending Arrivals</h2>
          <p className="text-body text-text-secondary mt-1">
            View and manage guests scheduled to arrive today
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by guest name, email, phone, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[48px] pl-10 pr-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
          />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-bg-card rounded-card border border-border p-4">
            <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Today</p>
            <p className="text-section-title font-bold text-alert-success m-0 mt-1">{todayArrivals.length}</p>
          </div>
          <div className="bg-bg-card rounded-card border border-border p-4">
            <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Overdue</p>
            <p className="text-section-title font-bold text-alert-error m-0 mt-1">{overdueArrivals.length}</p>
          </div>
          <div className="bg-bg-card rounded-card border border-border p-4">
            <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Upcoming</p>
            <p className="text-section-title font-bold text-text-primary m-0 mt-1">{upcomingArrivals.length}</p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <LuLoader className="w-8 h-8 text-brand animate-spin" />
            <p className="text-small text-text-muted mt-3">Loading arrivals...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasAll && (
          <div className="flex flex-col items-center justify-center py-16 bg-bg-card rounded-card border border-border">
            <HiOutlineCheckCircle className="w-12 h-12 text-alert-success mb-4" />
            <h3 className="text-card-title font-semibold text-text-primary m-0">All clear!</h3>
            <p className="text-body text-text-secondary mt-2 text-center max-w-sm">
              {search
                ? 'No arrivals match your search. Try a different name or room number.'
                : 'No pending arrivals. All confirmed guests have been checked in.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 text-small text-brand hover:text-brand-hover transition-colors font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Arrivals sections */}
        {!loading && hasAll && (
          <>
            {renderSection(
              'Arriving Today',
              <HiOutlineClock className="w-5 h-5 text-alert-success" />,
              todayArrivals,
              'text-alert-success'
            )}

            {renderSection(
              'Overdue Arrivals',
              <HiOutlineExclamationTriangle className="w-5 h-5 text-alert-error" />,
              overdueArrivals,
              'text-alert-error'
            )}

            {renderSection(
              'Upcoming Arrivals',
              <HiOutlineCalendarDays className="w-5 h-5 text-text-muted" />,
              upcomingArrivals,
              'text-text-muted'
            )}
          </>
        )}
      </main>
    </div>
  );
}
