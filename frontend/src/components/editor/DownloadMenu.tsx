import React, { useRef, useEffect } from 'react';
import { Image, FileText } from 'lucide-react';

interface DownloadMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
}

export const DownloadMenu: React.FC<DownloadMenuProps> = ({
  isOpen,
  onClose,
  onDownloadPng,
  onDownloadPdf,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 w-[240px] bg-white rounded-[16px] shadow-dropdown border border-hairline py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      <button
        onClick={() => {
          onDownloadPng();
          onClose();
        }}
        className="w-full h-[56px] px-4 flex items-center gap-3 hover:bg-[#F6F6F6] text-left transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-ghost flex items-center justify-center text-ink flex-shrink-0">
          <Image className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[14px] font-sans font-medium text-ink leading-tight">
            Image (PNG)
          </p>
          <p className="text-[12px] text-discreet leading-tight">
            Haute résolution
          </p>
        </div>
      </button>

      <button
        onClick={() => {
          onDownloadPdf();
          onClose();
        }}
        className="w-full h-[56px] px-4 flex items-center gap-3 hover:bg-[#F6F6F6] text-left transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-ghost flex items-center justify-center text-ink flex-shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[14px] font-sans font-medium text-ink leading-tight">
            Document (PDF)
          </p>
          <p className="text-[12px] text-discreet leading-tight">
            Format paysage
          </p>
        </div>
      </button>
    </div>
  );
};
