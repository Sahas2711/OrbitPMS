import { motion } from 'framer-motion';
import { HiOutlineInformationCircle } from 'react-icons/hi2';
import Button from './Button';

export default function EmptyState({
  icon: Icon = HiOutlineInformationCircle,
  title = 'No data found',
  description = 'There are no records to display.',
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 bg-bg-card rounded-card border border-border"
    >
      <div className="w-16 h-16 rounded-full bg-bg-table-header flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-card-title font-semibold text-text-primary m-0">{title}</h3>
      <p className="text-body text-text-secondary mt-2 text-center max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
