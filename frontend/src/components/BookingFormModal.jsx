import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { HiOutlineXMark } from 'react-icons/hi2';
import { differenceInDays, format, startOfDay } from 'date-fns';
import Button from './Button';
import { getRooms } from '../services/api';

export default function BookingFormModal({ open, onClose, onSave, booking = null }) {
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const firstInputRef = useRef(null);
  const isEditing = !!booking;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      room_id: '',
      check_in_date: '',
      check_out_date: '',
    },
  });

  const watchCheckIn = watch('check_in_date');
  const watchCheckOut = watch('check_out_date');
  const watchRoomId = watch('room_id');

  // ── Load rooms when modal opens ─────────────────────────────

  useEffect(() => {
    if (!open) return;

    if (booking) {
      reset({
        guest_name: booking.guest_name || '',
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        room_id: booking.room_id || '',
        check_in_date: booking.check_in_date || '',
        check_out_date: booking.check_out_date || '',
      });
    } else {
      reset({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        room_id: '',
        check_in_date: '',
        check_out_date: '',
      });
    }

    setServerError('');
    setSaving(false);

    // Fetch available rooms
    setRoomsLoading(true);
    getRooms({})
      .then((data) => setRooms(data))
      .catch(() => setServerError('Failed to load rooms. Please try again.'))
      .finally(() => setRoomsLoading(false));

    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [open, booking, reset]);

  // ── Keyboard escape handler ─────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // ── Calculate nights & total ────────────────────────────────

  const selectedRoom = useMemo(() => {
    if (!watchRoomId) return null;
    return rooms.find((r) => r.id === watchRoomId) || null;
  }, [watchRoomId, rooms]);

  const nights = useMemo(() => {
    if (!watchCheckIn || !watchCheckOut) return 0;
    const from = new Date(watchCheckIn);
    const to = new Date(watchCheckOut);
    const diff = differenceInDays(to, from);
    return diff > 0 ? diff : 0;
  }, [watchCheckIn, watchCheckOut]);

  const totalPreview = useMemo(() => {
    if (!selectedRoom || nights <= 0) return null;
    return selectedRoom.price_per_night * nights;
  }, [selectedRoom, nights]);

  // ── Submit handler ──────────────────────────────────────────

  const onSubmit = async (data) => {
    setServerError('');
    clearErrors();

    // Additional date validations that depend on the current form values
    if (data.check_in_date) {
      const checkIn = startOfDay(new Date(data.check_in_date));
      const today = startOfDay(new Date());
      if (checkIn < today) {
        setError('check_in_date', { message: 'Check-in date cannot be in the past' });
        return;
      }
    }

    if (data.check_in_date && data.check_out_date) {
      const from = startOfDay(new Date(data.check_in_date));
      const to = startOfDay(new Date(data.check_out_date));
      if (to <= from) {
        setError('check_out_date', { message: 'Check-out must be after check-in' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        guest_name: data.guest_name.trim(),
        guest_email: data.guest_email.trim() || null,
        guest_phone: data.guest_phone.trim() || null,
        room_id: data.room_id,
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
      };
      await onSave(payload);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.field && detail?.message) {
        if (['guest_name', 'guest_email', 'guest_phone', 'room_id', 'check_in_date', 'check_out_date'].includes(detail.field)) {
          setError(detail.field, { message: detail.message });
        } else {
          setServerError(detail.message);
        }
      } else if (typeof detail === 'string') {
        setServerError(detail);
      } else if (Array.isArray(detail)) {
        let hasFieldError = false;
        detail.forEach((errItem) => {
          const field = errItem.loc?.[errItem.loc.length - 1];
          if (field && ['guest_name', 'guest_email', 'guest_phone', 'room_id', 'check_in_date', 'check_out_date'].includes(field)) {
            setError(field, { message: errItem.msg || 'Invalid value' });
            hasFieldError = true;
          }
        });
        if (!hasFieldError) {
          setServerError('Validation failed. Please check your input.');
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (field) => errors[field]?.message;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-card-title font-semibold text-text-primary m-0">
            {isEditing ? 'Edit Booking' : 'New Booking'}
          </h3>
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-table-header transition-all"
            disabled={saving}
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Server Error */}
          {serverError && (
            <div className="p-3 rounded-input bg-red-50 border border-alert-error/20">
              <p className="text-small text-alert-error m-0">{serverError}</p>
            </div>
          )}

          {/* ── Guest Information Section ──────────────────────── */}
          <div>
            <h4 className="text-small font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Guest Information
            </h4>

            <div className="space-y-3">
              {/* Guest Name */}
              <div>
                <label htmlFor="guest-name" className="block text-small font-medium text-text-secondary mb-1.5">
                  Guest Name <span className="text-alert-error">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  id="guest-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  disabled={saving}
                  className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                    getFieldError('guest_name')
                      ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                      : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                  }`}
                  {...register('guest_name', {
                    required: 'Guest name is required',
                    maxLength: { value: 150, message: 'Name must be 150 characters or fewer' },
                  })}
                />
                {getFieldError('guest_name') && (
                  <p className="mt-1 text-caption text-alert-error">{getFieldError('guest_name')}</p>
                )}
              </div>

              {/* Guest Email */}
              <div>
                <label htmlFor="guest-email" className="block text-small font-medium text-text-secondary mb-1.5">
                  Email <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="guest-email"
                  type="email"
                  placeholder="john@example.com"
                  disabled={saving}
                  className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                    getFieldError('guest_email')
                      ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                      : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                  }`}
                  {...register('guest_email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email address format',
                    },
                  })}
                />
                {getFieldError('guest_email') && (
                  <p className="mt-1 text-caption text-alert-error">{getFieldError('guest_email')}</p>
                )}
              </div>

              {/* Guest Phone */}
              <div>
                <label htmlFor="guest-phone" className="block text-small font-medium text-text-secondary mb-1.5">
                  Phone <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  placeholder="+1-555-0123"
                  disabled={saving}
                  className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register('guest_phone', { maxLength: 20 })}
                />
              </div>
            </div>
          </div>

          {/* ── Divider ─────────────────────────────────────────── */}
          <div className="border-t border-border" />

          {/* ── Room & Dates Section ─────────────────────────────── */}
          <div>
            <h4 className="text-small font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Room &amp; Dates
            </h4>

            <div className="space-y-3">
              {/* Room Selection */}
              <div>
                <label htmlFor="room-select" className="block text-small font-medium text-text-secondary mb-1.5">
                  Select Room <span className="text-alert-error">*</span>
                </label>
                <select
                  id="room-select"
                  disabled={saving || roomsLoading}
                  className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    getFieldError('room_id')
                      ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                      : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                  }`}
                  {...register('room_id', { required: 'Please select a room' })}
                >
                  <option value="">
                    {roomsLoading ? 'Loading rooms...' : 'Select a room...'}
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} — {room.room_type} (${parseFloat(room.price_per_night).toFixed(2)}/night)
                    </option>
                  ))}
                </select>
                {getFieldError('room_id') && (
                  <p className="mt-1 text-caption text-alert-error">{getFieldError('room_id')}</p>
                )}
              </div>

              {/* Check-in Date */}
              <div>
                <label htmlFor="check-in" className="block text-small font-medium text-text-secondary mb-1.5">
                  Check-in Date <span className="text-alert-error">*</span>
                </label>
                <input
                  id="check-in"
                  type="date"
                  disabled={saving}
                  className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                    getFieldError('check_in_date')
                      ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                      : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                  }`}
                  {...register('check_in_date', { required: 'Check-in date is required' })}
                />
                {getFieldError('check_in_date') && (
                  <p className="mt-1 text-caption text-alert-error">{getFieldError('check_in_date')}</p>
                )}
              </div>

              {/* Check-out Date */}
              <div>
                <label htmlFor="check-out" className="block text-small font-medium text-text-secondary mb-1.5">
                  Check-out Date <span className="text-alert-error">*</span>
                </label>
                <input
                  id="check-out"
                  type="date"
                  disabled={saving}
                  className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                    getFieldError('check_out_date')
                      ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                      : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                  }`}
                  {...register('check_out_date', { required: 'Check-out date is required' })}
                />
                {getFieldError('check_out_date') && (
                  <p className="mt-1 text-caption text-alert-error">{getFieldError('check_out_date')}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Price Preview ──────────────────────────────────── */}
          {selectedRoom && nights > 0 && totalPreview !== null && (
            <div className="p-4 rounded-input bg-brand-light border border-brand/20">
              <div className="flex items-center justify-between text-small text-text-secondary">
                <span>
                  ${parseFloat(selectedRoom.price_per_night).toFixed(2)} × {nights} night{nights > 1 ? 's' : ''}
                </span>
                <span className="text-body font-semibold text-text-primary">
                  ${totalPreview.toFixed(2)}
                </span>
              </div>
              {nights > 0 && (
                <p className="text-caption text-text-muted mt-1">
                  {format(new Date(watchCheckIn), 'MMM d, yyyy')} — {format(new Date(watchCheckOut), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          )}

          {/* ── Actions ────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="min-w-[140px]">
              {isEditing ? 'Update Booking' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
