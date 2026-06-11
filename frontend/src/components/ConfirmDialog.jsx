import { useEffect, useRef } from 'react';
import { HiOutlineExclamationTriangle, HiOutlineXMark } from 'react-icons/hi2';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-sm bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
              <HiOutlineExclamationTriangle className="w-5 h-5 text-alert-error" />
            </div>
            <h3 className="text-body font-semibold text-text-primary m-0">{title}</h3>
          </div>
          <button
            onClick={loading ? undefined : onCancel}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-table-header transition-all"
            disabled={loading}
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-small text-text-secondary m-0 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-table-header/50">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
