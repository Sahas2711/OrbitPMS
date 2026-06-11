import { useState, useEffect, useRef } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import Button from './Button';

const INITIAL_FORM = {
  room_number: '',
  room_type: 'standard',
  price_per_night: '',
  description: '',
};

const INITIAL_ERRORS = {
  room_number: '',
  room_type: '',
  price_per_night: '',
  description: '',
};

export default function RoomFormModal({ open, onClose, onSave, room = null }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const firstInputRef = useRef(null);
  const isEditing = !!room;

  useEffect(() => {
    if (open) {
      if (room) {
        setForm({
          room_number: room.room_number,
          room_type: room.room_type,
          price_per_night: room.price_per_night.toString(),
          description: room.description || '',
        });
      } else {
        setForm(INITIAL_FORM);
      }
      setErrors(INITIAL_ERRORS);
      setServerError('');
      setSaving(false);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, room]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const validate = () => {
    const newErrors = { ...INITIAL_ERRORS };
    let valid = true;

    const num = form.room_number.trim().toUpperCase();
    if (!num) {
      newErrors.room_number = 'Room number is required';
      valid = false;
    } else if (num.length > 10) {
      newErrors.room_number = 'Room number must be 10 characters or fewer';
      valid = false;
    }

    if (!['standard', 'deluxe', 'suite'].includes(form.room_type)) {
      newErrors.room_type = 'Please select a valid room type';
      valid = false;
    }

    const price = parseFloat(form.price_per_night);
    if (!form.price_per_night) {
      newErrors.price_per_night = 'Price per night is required';
      valid = false;
    } else if (isNaN(price) || price <= 0) {
      newErrors.price_per_night = 'Price must be greater than 0';
      valid = false;
    } else if (price > 9999999.99) {
      newErrors.price_per_night = 'Price is too high';
      valid = false;
    }

    if (form.description && form.description.length > 1000) {
      newErrors.description = 'Description must be under 1000 characters';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        room_number: form.room_number.trim().toUpperCase(),
        room_type: form.room_type,
        price_per_night: parseFloat(form.price_per_night),
        description: form.description.trim() || null,
      };
      await onSave(payload);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.field && detail?.message) {
        if (detail.field in errors) {
          setErrors((prev) => ({ ...prev, [detail.field]: detail.message }));
        } else {
          setServerError(detail.message);
        }
      } else if (typeof detail === 'string') {
        setServerError(detail);
      } else if (Array.isArray(detail)) {
        const fieldErrors = {};
        detail.forEach((errItem) => {
          const field = errItem.loc?.[errItem.loc.length - 1];
          if (field && field in INITIAL_ERRORS) {
            fieldErrors[field] = errItem.msg || 'Invalid value';
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        } else {
          setServerError('Validation failed. Please check your input.');
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (serverError) setServerError('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-card-title font-semibold text-text-primary m-0">
            {isEditing ? 'Edit Room' : 'Add New Room'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="p-3 rounded-input bg-red-50 border border-alert-error/20">
              <p className="text-small text-alert-error m-0">{serverError}</p>
            </div>
          )}

          <div>
            <label htmlFor="room-number" className="block text-small font-medium text-text-secondary mb-1.5">
              Room Number <span className="text-alert-error">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="room-number"
              type="text"
              placeholder="e.g. 101, 202A"
              value={form.room_number}
              onChange={(e) => handleChange('room_number', e.target.value)}
              disabled={saving}
              maxLength={10}
              className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.room_number
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
            />
            {errors.room_number && (
              <p className="mt-1 text-caption text-alert-error">{errors.room_number}</p>
            )}
          </div>

          <div>
            <label htmlFor="room-type" className="block text-small font-medium text-text-secondary mb-1.5">
              Room Type <span className="text-alert-error">*</span>
            </label>
            <select
              id="room-type"
              value={form.room_type}
              onChange={(e) => handleChange('room_type', e.target.value)}
              disabled={saving}
              className={`w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.room_type
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
            >
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="suite">Suite</option>
            </select>
            {errors.room_type && <p className="mt-1 text-caption text-alert-error">{errors.room_type}</p>}
          </div>

          <div>
            <label htmlFor="room-price" className="block text-small font-medium text-text-secondary mb-1.5">
              Price per Night ($) <span className="text-alert-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-text-muted pointer-events-none">$</span>
              <input
                id="room-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="150.00"
                value={form.price_per_night}
                onChange={(e) => handleChange('price_per_night', e.target.value)}
                disabled={saving}
                className={`w-full h-[44px] pl-7 pr-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.price_per_night
                    ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                    : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
                }`}
              />
            </div>
            {errors.price_per_night && <p className="mt-1 text-caption text-alert-error">{errors.price_per_night}</p>}
          </div>

          <div>
            <label htmlFor="room-description" className="block text-small font-medium text-text-secondary mb-1.5">
              Description <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="room-description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Optional room description..."
              maxLength={1000}
              className={`w-full px-4 py-2.5 text-body bg-bg-card border rounded-input outline-none transition-all duration-150 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
                errors.description
                  ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                  : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description ? (
                <p className="text-caption text-alert-error">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-caption text-text-muted">{form.description.length}/1000</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEditing ? 'Update Room' : 'Create Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
