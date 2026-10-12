import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, icon, className }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 h-[34px] px-4 rounded-pill bg-ghost text-[14px] font-sans font-medium text-[#222]',
          className
        )
      )}
    >
      {icon && <span className="inline-flex items-center text-muted">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};
