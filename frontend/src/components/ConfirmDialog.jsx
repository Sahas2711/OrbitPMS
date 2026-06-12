import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import Button from './Button';

const VARIANTS = {
  danger: {
    icon: HiOutlineExclamationTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-alert-error',
    buttonVariant: 'danger',
    titleColor: 'text-text-primary',
  },
  warning: {
    icon: HiOutlineExclamationTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-alert-warning',
    buttonVariant: 'primary',
    titleColor: 'text-text-primary',
  },
  info: {
    icon: HiOutlineInformationCircle,
    iconBg: 'bg-blue-50',
    iconColor: 'text-alert-info',
    buttonVariant: 'primary',
    titleColor: 'text-text-primary',
  },
  success: {
    icon: HiOutlineCheckCircle,
    iconBg: 'bg-green-50',
    iconColor: 'text-alert-success',
    buttonVariant: 'primary',
    titleColor: 'text-text-primary',
  },
};

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
  const config = VARIANTS[variant] || VARIANTS.danger;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <h3 className={`text-body font-semibold m-0 ${config.titleColor}`}>{title}</h3>
              </div>
              <button
                onClick={loading ? undefined : onCancel}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-table-header transition-all"
                disabled={loading}
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-small text-text-secondary m-0 leading-relaxed">{message}</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-table-header/30">
              <Button variant="secondary" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button variant={config.buttonVariant} onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
