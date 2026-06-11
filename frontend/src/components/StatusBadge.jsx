import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineWrenchScrewdriver,
  HiOutlineQuestionMarkCircle,
  HiOutlineCalendarDays,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

const STATUS_CONFIG = {
  // ── Room statuses ────────────────────────────────────────────
  available: {
    label: 'Available',
    bg: 'bg-alert-success/10',
    text: 'text-alert-success',
    dot: 'bg-alert-success',
    icon: HiOutlineCheckCircle,
  },
  occupied: {
    label: 'Occupied',
    bg: 'bg-alert-error/10',
    text: 'text-alert-error',
    dot: 'bg-alert-error',
    icon: HiOutlineXCircle,
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'bg-alert-warning/10',
    text: 'text-alert-warning',
    dot: 'bg-alert-warning',
    icon: HiOutlineWrenchScrewdriver,
  },
  // ── Booking statuses ─────────────────────────────────────────
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-alert-info/10',
    text: 'text-alert-info',
    dot: 'bg-alert-info',
    icon: HiOutlineCheckCircle,
  },
  checked_in: {
    label: 'Checked In',
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    dot: 'bg-cyan-500',
    icon: HiOutlineCalendarDays,
  },
  checked_out: {
    label: 'Checked Out',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
    icon: HiOutlineArrowRightOnRectangle,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-500',
    dot: 'bg-red-400',
    icon: HiOutlineXCircle,
  },
};

export default function StatusBadge({ status = 'unknown' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    bg: 'bg-bg-table-header',
    text: 'text-text-secondary',
    dot: 'bg-text-muted',
    icon: HiOutlineQuestionMarkCircle,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
