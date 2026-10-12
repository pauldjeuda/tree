import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  arrow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'default',
  arrow = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-medium transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[#0A0A0A] text-white hover:bg-[#262626] rounded-pill shadow-none disabled:bg-[#D9D9D9] disabled:text-[#8C8C8C]',
    secondary:
      'bg-white text-ink border border-[#E0E0E0] hover:bg-[#F9F9F9] rounded-pill disabled:bg-[#F5F5F5] disabled:text-muted',
    danger:
      'bg-danger text-white hover:bg-danger/90 rounded-pill',
    ghost:
      'bg-transparent text-ink hover:bg-black/5 rounded-pill',
  };

  const sizes = {
    sm: 'h-9 px-4 text-[13px]',
    default: 'h-[52px] px-6 text-[15px]',
    lg: 'h-[56px] px-8 text-[16px]',
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, variants[variant], sizes[size], className)
      )}
      disabled={disabled}
      {...props}
    >
      <span>{children}</span>
      {arrow && (
        <span className="ml-2 text-base leading-none transition-transform group-hover:translate-x-0.5">
          →
        </span>
      )}
    </button>
  );
};
