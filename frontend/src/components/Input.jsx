import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    type = 'text',
    placeholder,
    error,
    icon: Icon,
    rightIcon,
    disabled,
    className = '',
    inputClassName = '',
    ...props
  },
  ref
) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-small font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-5 h-5 text-text-muted" />
          </div>
        )}

        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border
            rounded-input outline-none transition-all duration-150
            placeholder:text-text-muted
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? 'border-alert-error focus:ring-2 focus:ring-alert-error/20'
                : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
            }
            ${Icon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${inputClassName}
          `}
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-caption text-alert-error">{error}</p>
      )}
    </div>
  );
});

export default Input;
