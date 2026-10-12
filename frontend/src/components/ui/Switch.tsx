import React from 'react';
import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  compact?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  sublabel,
  disabled,
  compact = false,
}) => {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none gap-2">
      {(label || sublabel) && (
        <div className="flex flex-col text-left">
          {label && (
            <span className={compact ? 'text-[12px] font-sans font-medium text-ink' : 'text-[14px] font-sans font-medium text-ink'}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className={compact ? 'text-[11px] text-discreet' : 'text-[13px] text-discreet'}>
              {sublabel}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2',
          compact ? 'h-5 w-9' : 'h-6 w-11',
          checked ? 'bg-ink' : 'bg-[#D6D6D6]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            compact
              ? checked
                ? 'h-4 w-4 translate-x-4'
                : 'h-4 w-4 translate-x-0'
              : checked
              ? 'h-5 w-5 translate-x-5'
              : 'h-5 w-5 translate-x-0'
          )}
        />
      </button>
    </label>
  );
};
