import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { pdf } from '@react-pdf/renderer';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
  HiOutlineCalculator,
  HiOutlineCheckCircle,
  HiOutlineBuildingOffice2,
  HiOutlineReceiptPercent,
  HiOutlineDocumentArrowDown,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';
import { format, parseISO, differenceInDays } from 'date-fns';

import StatusBadge from '../components/StatusBadge';
import InvoicePDF from '../components/InvoicePDF';
import { getBookings, checkOutBooking, uploadInvoicePdf } from '../services/api';

const TAX_RATE = 0.10;

export default function CheckOut() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkingOut, setCheckingOut] = useState({});
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [lastBooking, setLastBooking] = useState(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

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

  useEffect(() => { fetchCheckedIn(); }, [fetchCheckedIn]);

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guest_name?.toLowerCase().includes(q) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.room_number && b.room_number.toLowerCase().includes(q))
    );
  });

  const calculateCharges = (booking) => {
    const today = new Date();
    const checkIn = parseISO(booking.check_in_date);
    const scheduledCheckOut = parseISO(booking.check_out_date);
    const actualCheckOut = today < scheduledCheckOut ? today : scheduledCheckOut;
    let nights = differenceInDays(actualCheckOut, checkIn);
    if (nights <= 0) nights = 1;

    const scheduledNights = differenceInDays(scheduledCheckOut, checkIn) || 1;
    const estimatedRate = booking.total_amount
      ? parseFloat(booking.total_amount) / scheduledNights
      : 150;

    const subtotal = estimatedRate * nights;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    return { nights, rate: estimatedRate, subtotal, tax, total, actualCheckOut };
  };

  const generateAndOpenPdf = async (invoice, booking) => {
    setPdfGenerating(true);
    try {
      // Create the PDF document component
      const doc = <InvoicePDF invoice={invoice} booking={booking} guest={booking} />;
      const asPdf = pdf();
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();

      // Open in new tab for viewing & printing
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.focus();
      }
      // Blob URL is cleaned up when the tab is closed or page navigated

      // Upload to backend for persistent storage
      try {
        await uploadInvoicePdf(invoice.id, blob, invoice.invoice_number);
      } catch (err) {
        console.warn('Failed to upload PDF to backend for storage:', err);
      }

      return blob;
    } catch (err) {
      toast.error('Failed to generate PDF');
      return null;
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleCheckOut = async (booking) => {
    setCheckingOut((prev) => ({ ...prev, [booking.id]: true }));
    try {
      const invoice = await checkOutBooking(booking.id);
      setInvoiceResult(invoice);
      setLastBooking(booking);
      setInvoiceVisible(true);
      toast.success(`${booking.guest_name} checked out!`);

      // Generate PDF on frontend and open it
      setTimeout(() => generateAndOpenPdf(invoice, booking), 400);

      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to check out guest.';
      toast.error(msg);
    } finally {
      setCheckingOut((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  const handleViewPdf = () => {
    // Re-generate the PDF using stored booking data for guest info
    if (invoiceResult && lastBooking) {
      generateAndOpenPdf(invoiceResult, lastBooking);
    } else if (invoiceResult) {
      generateAndOpenPdf(invoiceResult, invoiceResult);
    }
  };

  const renderCard = (booking) => {
    const isCheckingOut = checkingOut[booking.id];
    const charges = calculateCharges(booking);

    return (
      <motion.div
        key={booking.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-card rounded-card border border-border shadow-card hover:shadow-hover transition-all"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
                <HiOutlineUser className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-body font-semibold text-text-primary m-0 truncate">{booking.guest_name}</h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-small text-text-muted flex items-center gap-1">
                    <HiOutlineBuildingOffice2 className="w-3.5 h-3.5" />
                    Room {booking.room_number || '—'}
                    {booking.room_type && <span className="capitalize"> ({booking.room_type})</span>}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="text-caption text-text-muted">
                    Stay: {format(parseISO(booking.check_in_date), 'MMM d')} - {format(parseISO(booking.check_out_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={booking.booking_status} size="sm" />
          </div>

          {/* Charges */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <HiOutlineCalculator className="w-4 h-4 text-text-muted" />
              <span className="text-small font-medium text-text-secondary">Charge Preview</span>
            </div>
            <div className="bg-bg-table-header/30 rounded-input p-3 space-y-1.5">
              <div className="flex items-center justify-between text-small">
                <span className="text-text-secondary">
                  Room charges ({charges.nights} night{charges.nights > 1 ? 's' : ''} × ${charges.rate.toFixed(2)})
                </span>
                <span className="font-medium text-text-primary">${charges.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-text-secondary">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                <span className="font-medium text-text-primary">${charges.tax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-body font-bold pt-1.5 border-t border-border">
                <span className="text-text-primary">Total</span>
                <span className="text-brand text-card-title">${charges.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleCheckOut(booking)}
              disabled={isCheckingOut}
              className="h-[40px] px-5 rounded-button text-small font-medium bg-brand text-white hover:bg-brand-hover transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? (
                <><LuLoader className="w-4 h-4 animate-spin" />Processing...</>
              ) : (
                <><HiOutlineArrowRightOnRectangle className="w-4 h-4" />Complete Check-out</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderInvoiceModal = () => {
    if (!invoiceVisible || !invoiceResult) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setInvoiceVisible(false)} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden"
        >
          <div className="px-6 py-6 border-b border-border bg-alert-success/5 text-center">
            <div className="w-14 h-14 rounded-full bg-alert-success/20 flex items-center justify-center mx-auto mb-3">
              <HiOutlineCheckCircle className="w-8 h-8 text-alert-success" />
            </div>
            <h3 className="text-card-title font-bold text-text-primary m-0">Check-out Complete</h3>
            <p className="text-small text-text-secondary mt-1">Invoice #{invoiceResult.invoice_number}</p>
            <p className="text-caption text-alert-success mt-1 flex items-center justify-center gap-1">
              <HiOutlineReceiptPercent className="w-3.5 h-3.5" />
              PDF generated on your browser
            </p>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">Invoice #</span>
              <span className="font-semibold text-text-primary font-mono">{invoiceResult.invoice_number}</span>
            </div>
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">Room charges</span>
              <span className="text-text-primary">${parseFloat(invoiceResult.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">Tax</span>
              <span className="text-text-primary">${parseFloat(invoiceResult.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-body font-bold pt-3 border-t border-border">
              <span className="text-text-primary">Total Paid</span>
              <span className="text-brand text-section-title">${parseFloat(invoiceResult.total_amount).toFixed(2)}</span>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border bg-bg-table-header/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleViewPdf}
              disabled={pdfGenerating}
              className="flex-1 h-[40px] px-4 rounded-button bg-brand text-white font-medium text-small hover:bg-brand-hover transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {pdfGenerating ? (
                <><LuLoader className="w-4 h-4 animate-spin" />Generating...</>
              ) : (
                <><HiOutlineDocumentArrowDown className="w-4 h-4" />View Invoice</>
              )}
            </button>
            <button
              onClick={handleViewPdf}
              disabled={pdfGenerating}
              className="flex-1 h-[40px] px-4 rounded-button bg-bg-card border border-border text-text-primary font-medium text-small hover:bg-bg-table-header transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {pdfGenerating ? (
                <><LuLoader className="w-4 h-4 animate-spin" />Generating...</>
              ) : (
                <><HiOutlinePrinter className="w-4 h-4" />Print Invoice</>
              )}
            </button>
            <button
              onClick={() => setInvoiceVisible(false)}
              className="h-[40px] px-4 rounded-button text-text-secondary font-medium text-small hover:text-text-primary transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-section-title font-bold text-text-primary m-0">Check-Out</h2>
        <p className="text-body text-text-secondary mt-1">Check out guests and generate invoices</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search by guest name or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[40px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
        />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-bg-card rounded-card border border-border px-4 py-3">
          <p className="text-caption text-text-muted uppercase tracking-wider font-medium">Checked In</p>
          <p className="text-section-title font-bold text-cyan-600 m-0 mt-1">
            {loading ? '...' : filteredBookings.length}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LuLoader className="w-8 h-8 text-brand animate-spin" />
          <p className="text-small text-text-muted mt-3">Loading checked-in guests...</p>
        </div>
      )}

      {!loading && filteredBookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-card rounded-card border border-border">
          <HiOutlineCheckCircle className="w-12 h-12 text-text-muted mb-4" />
          <h3 className="text-card-title font-semibold text-text-primary m-0">No checked-in guests</h3>
          <p className="text-body text-text-secondary mt-2 text-center max-w-sm">
            {search ? 'No guests match your search.' : 'There are currently no guests checked in.'}
          </p>
        </div>
      )}

      {!loading && filteredBookings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredBookings.map(renderCard)}
        </div>
      )}

      {renderInvoiceModal()}
    </div>
  );
}
