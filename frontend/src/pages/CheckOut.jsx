import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineBuildingOffice2,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
  HiOutlineCalculator,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';
import { format, parseISO, differenceInDays } from 'date-fns';

import StatusBadge from '../components/StatusBadge';
import { getBookings, checkOutBooking } from '../services/api';

export default function CheckOut() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkingOut, setCheckingOut] = useState({});
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);

  // ── Fetch checked-in bookings ───────────────────────────────

  const fetchCheckedIn = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookings({ status: 'checked_in', limit: 200 });
      setBookings(data);
    } catch {
      toast.error('Failed to load checked-in guests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckedIn();
  }, [fetchCheckedIn]);

  // ── Filter/search ───────────────────────────────────────────

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guest_name?.toLowerCase().includes(q) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.guest_phone && b.guest_phone.toLowerCase().includes(q)) ||
      (b.room_number && b.room_number.toLowerCase().includes(q))
    );
  });

  // ── Charge calculation helper (mirrors backend logic) ────────

  const TAX_RATE = 0.10;

  const calculateCharges = (booking) => {
    const today = new Date();
    const checkIn = parseISO(booking.check_in_date);
    const scheduledCheckOut = parseISO(booking.check_out_date);
    const actualCheckOut = today < scheduledCheckOut ? today : scheduledCheckOut;
    let nights = differenceInDays(actualCheckOut, checkIn);
    if (nights <= 0) nights = 1;

    // Estimate room rate from total_amount if available
    const scheduledNights = differenceInDays(scheduledCheckOut, checkIn) || 1;
    const estimatedRate = booking.total_amount
      ? parseFloat(booking.total_amount) / scheduledNights
      : 150;

    const subtotal = estimatedRate * nights;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    return { nights, rate: estimatedRate, subtotal, tax, total, actualCheckOut };
  };

  // ── Check-out handler ───────────────────────────────────────

  const handleCheckOut = async (booking) => {
    setCheckingOut((prev) => ({ ...prev, [booking.id]: true }));
    try {
      const invoice = await checkOutBooking(booking.id);
      setInvoiceResult(invoice);
      setInvoiceVisible(true);
      toast.success(`${booking.guest_name} has been checked out!`);
      // Remove from list
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'object' && detail?.message
          ? detail.message
          : typeof detail === 'string'
            ? detail
            : 'Failed to check out guest.';
      toast.error(message);
    } finally {
      setCheckingOut((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  // ── Render booking card ─────────────────────────────────────

  const renderBookingCard = (booking) => {
    const isCheckingOut = checkingOut[booking.id];
    const charges = calculateCharges(booking);

    return (
      <div
        key={booking.id}
        className="bg-bg-card rounded-card border border-border shadow-card hover:shadow-hover transition-all"
      >
        <div className="p-5">
          {/* Guest info header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineUser className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <h4 className="text-body font-semibold text-text-primary m-0 truncate">
                  {booking.guest_name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-small text-text-muted flex items-center gap-1">
                    <HiOutlineBuildingOffice2 className="w-3.5 h-3.5" />
                    {booking.room_number || '—'}
                    {booking.room_type && (
                      <span className="capitalize"> ({booking.room_type})</span>
                    )}
                  </span>
                  {booking.guest_email && (
                    <span className="text-caption text-text-muted">{booking.guest_email}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="text-caption text-text-muted">
                    Checked in: {format(parseISO(booking.check_in_date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-caption text-text-muted">
                    Scheduled out: {format(parseISO(booking.check_out_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={booking.booking_status} />
          </div>

          {/* Charges breakdown */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <HiOutlineCalculator className="w-4 h-4 text-text-muted" />
              <span className="text-small font-medium text-text-secondary">Charge Preview</span>
            </div>
            <div className="bg-bg-table-header/50 rounded-input p-3 space-y-1.5">
              <div className="flex items-center justify-between text-small">
                <span className="text-text-secondary">
                  Room charges ({charges.nights} night{charges.nights > 1 ? 's' : ''} × ${charges.rate.toFixed(2)})
                </span>
                <span className="text-text-primary font-medium">${charges.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-text-secondary">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                <span className="text-text-primary font-medium">${charges.tax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-body font-semibold pt-1.5 border-t border-border">
                <span className="text-text-primary">Total</span>
                <span className="text-brand">${charges.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Check-out button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleCheckOut(booking)}
              disabled={isCheckingOut}
              className="h-[40px] px-5 py-2 rounded-button text-small font-medium bg-brand text-white hover:bg-brand-hover active:bg-brand-hover transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                  Complete Check-out
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Invoice receipt modal ───────────────────────────────────

  const renderInvoiceModal = () => {
    if (!invoiceVisible || !invoiceResult) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setInvoiceVisible(false)} />
        <div className="relative w-full max-w-md bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden">
          <div className="flex items-center justify-center px-6 py-6 border-b border-border bg-alert-success/5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-alert-success/20 flex items-center justify-center">
                <HiOutlineCheckCircle className="w-7 h-7 text-alert-success" />
              </div>
              <h3 className="text-card-title font-semibold text-text-primary m-0">Check-out Complete</h3>
              <p className="text-small text-text-secondary m-0">
                Invoice {invoiceResult.invoice_number}
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">Invoice #</span>
              <span className="font-medium text-text-primary">{invoiceResult.invoice_number}</span>
            </div>
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">Room charges</span>
              <span className="text-text-primary">${parseFloat(invoiceResult.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">Tax</span>
              <span className="text-text-primary">${parseFloat(invoiceResult.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-body font-semibold pt-3 border-t border-border">
              <span className="text-text-primary">Total Paid</span>
              <span className="text-brand text-section-title">
                ${parseFloat(invoiceResult.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-bg-table-header/50 flex justify-center">
            <button
              onClick={() => setInvoiceVisible(false)}
              className="h-[40px] px-6 py-2 rounded-button text-small font-medium bg-brand text-white hover:bg-brand-hover transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────

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
          <h2 className="text-section-title font-bold text-text-primary m-0">Check Out</h2>
          <p className="text-body text-text-secondary mt-1">
            Check out guests and generate invoices
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

        {/* Summary */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-bg-card rounded-card border border-border px-4 py-3">
            <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Checked In</p>
            <p className="text-section-title font-bold text-cyan-600 m-0 mt-1">
              {loading ? '...' : filteredBookings.length}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <LuLoader className="w-8 h-8 text-brand animate-spin" />
            <p className="text-small text-text-muted mt-3">Loading checked-in guests...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredBookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-bg-card rounded-card border border-border">
            <HiOutlineCheckCircle className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-card-title font-semibold text-text-primary m-0">No checked-in guests</h3>
            <p className="text-body text-text-secondary mt-2 text-center max-w-sm">
              {search
                ? 'No guests match your search.'
                : 'There are currently no guests checked in.'}
            </p>
          </div>
        )}

        {/* Cards */}
        {!loading && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map(renderBookingCard)}
          </div>
        )}
      </main>

      {/* Invoice modal */}
      {renderInvoiceModal()}
    </div>
  );
}
