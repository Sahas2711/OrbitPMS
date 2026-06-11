import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineWrenchScrewdriver,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2';

const STATUS_CONFIG = {
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
