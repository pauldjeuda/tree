import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, compact = false, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1 text-left">
        {label && (
          <label htmlFor={inputId} className={compact ? 'text-[12px] font-sans font-medium text-ink' : 'text-[14px] font-sans font-medium text-ink'}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={twMerge(
            clsx(
              'w-full bg-white border border-[#E3E3E3] rounded-field text-ink placeholder:text-muted/70 transition-all focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent disabled:bg-[#FAFAFA] disabled:text-muted',
              compact ? 'h-[38px] text-[13px] px-3 rounded-xl' : 'h-[50px] text-[15px] px-4',
              error && 'border-danger focus:ring-danger',
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <span className={compact ? 'text-[11px] text-discreet' : 'text-[13px] text-discreet'}>{helperText}</span>
        )}
        {error && <span className={compact ? 'text-[11px] text-danger' : 'text-[13px] text-danger'}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
