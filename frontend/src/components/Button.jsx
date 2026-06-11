import { LuLoader } from 'react-icons/lu';

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  ...props
}) {
  const baseStyles =
    'h-[44px] px-6 py-2.5 rounded-button font-medium text-body cursor-pointer transition-all duration-150 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-hover active:bg-brand-hover',
    secondary:
      'bg-bg-card text-text-primary border border-border-secondary hover:bg-bg-table-header active:bg-bg-table-header',
    danger:
      'bg-alert-error text-white hover:bg-red-700 active:bg-red-700',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <LuLoader className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
