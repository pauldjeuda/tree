import React from 'react';
import { Button } from './Button.js';

export const PageLoader: React.FC<{ label?: string }> = ({ label = "Chargement de l'arbre…" }) => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-paper" role="status" aria-live="polite">
    <div className="w-10 h-10 border-[3px] border-ink border-t-coral rounded-full animate-spin mb-4" />
    <p className="text-[15px] font-sans text-discreet">{label}</p>
  </div>
);

export const PageError: React.FC<{
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}> = ({ title, message, actionLabel, onAction }) => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-paper px-6 text-center" role="alert">
    <h1 className="text-[28px] font-sans font-semibold tracking-tight text-ink mb-2">{title}</h1>
    <p className="text-[16px] font-sans text-discreet max-w-md mb-6">{message}</p>
    <Button variant="primary" arrow onClick={onAction}>
      {actionLabel}
    </Button>
  </div>
);
