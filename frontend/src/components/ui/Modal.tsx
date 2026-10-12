import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-[520px]',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur as specified in Screen 4 bis */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-[4px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={clsx(
          'relative w-full max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-panel p-8 shadow-modal z-10 animate-in fade-in zoom-in-95 duration-200',
          maxWidth
        )}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center text-discreet hover:text-ink hover:bg-black/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {title && (
          <h2 className="text-[24px] font-sans font-semibold tracking-tight text-ink mb-2 text-left">
            {title}
          </h2>
        )}

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
};
