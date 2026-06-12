import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  HiOutlineXMark,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineCurrencyDollar,
  HiOutlineCheckCircle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineTrash,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import StatusBadge from './StatusBadge';
import Button from './Button';

export default function BookingDrawer({
  open,
  booking,
  onClose,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
}) {
  if (!booking) return null;

  const nights = (() => {
    try {
      return differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));
    } catch { return 0; }
  })();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-bg-card shadow-drawer z-[60] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HiOutlineCalendarDays className="w-5 h-5 text-brand" />
                <h3 className="text-body font-semibold text-text-primary m-0">Booking Details</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-table-header transition-all"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Guest Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <HiOutlineUser className="w-6 h-6 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-card-title font-bold text-text-primary m-0 truncate">
                    {booking.guest_name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    {booking.guest_email && (
                      <span className="text-small text-text-secondary flex items-center gap-1.5">
                        <HiOutlineEnvelope className="w-3.5 h-3.5 text-text-muted" />
                        {booking.guest_email}
                      </span>
                    )}
                    {booking.guest_phone && (
                      <span className="text-small text-text-secondary flex items-center gap-1.5">
                        <HiOutlinePhone className="w-3.5 h-3.5 text-text-muted" />
                        {booking.guest_phone}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={booking.booking_status} />
              </div>

              {/* Room & Dates */}
              <div className="bg-bg-table-header/30 rounded-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                    <HiOutlineBuildingOffice2 className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-small font-medium text-text-primary m-0">
                      Room {booking.room_number || '—'}
                    </p>
                    {booking.room_type && (
                      <p className="text-caption text-text-muted capitalize m-0">{booking.room_type}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-caption text-text-muted m-0">Check-In</p>
                    <p className="text-small font-semibold text-text-primary m-0 mt-0.5">
                      {(() => {
                        try { return format(parseISO(booking.check_in_date), 'MMM d, yyyy'); }
                        catch { return booking.check_in_date; }
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-text-muted m-0">Check-Out</p>
                    <p className="text-small font-semibold text-text-primary m-0 mt-0.5">
                      {(() => {
                        try { return format(parseISO(booking.check_out_date), 'MMM d, yyyy'); }
                        catch { return booking.check_out_date; }
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-small text-text-secondary">
                    Stay duration: <strong className="text-text-primary">{Math.max(nights, 1)} night{Math.max(nights, 1) > 1 ? 's' : ''}</strong>
                  </span>
                </div>
              </div>

              {/* Charges */}
              {booking.total_amount && (
                <div>
                  <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">
                    Charges
                  </p>
                  <div className="bg-bg-table-header/30 rounded-card p-4 space-y-2">
                    <div className="flex items-center justify-between text-small">
                      <span className="text-text-secondary">Room Charges</span>
                      <span className="font-medium text-text-primary">
                        ${parseFloat(booking.total_amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-small">
                      <span className="text-text-secondary">Tax (10%)</span>
                      <span className="font-medium text-text-primary">
                        ${(parseFloat(booking.total_amount) * 0.1).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-body font-bold text-text-primary">Total</span>
                      <span className="text-card-title font-bold text-brand">
                        ${(parseFloat(booking.total_amount) * 1.1).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-caption text-text-muted uppercase tracking-wider font-medium">
                  Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {booking.booking_status === 'confirmed' && (
                    <Button onClick={() => { onClose(); onCheckIn?.(booking); }} className="w-full">
                      <HiOutlineCheckCircle className="w-4 h-4" />
                      Check In
                    </Button>
                  )}
                  {booking.booking_status === 'checked_in' && (
                    <Button onClick={() => { onClose(); onCheckOut?.(booking); }} className="w-full">
                      <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                      Check Out
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => { onClose(); onEdit?.(booking); }} className="w-full">
                    <HiOutlinePencilSquare className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => { onClose(); onDelete?.(booking); }}
                    className="w-full"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
