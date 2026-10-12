import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

export const InactiveLink: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-page-radial flex flex-col items-center justify-center p-6 text-center select-none">
      <Badge className="mb-6">Lien inactif</Badge>

      <h1 className="text-3xl sm:text-4xl md:text-[52px] leading-tight md:leading-[58px] tracking-tighter font-semibold mb-4">
        <span className="block text-[#111111]">Cet arbre n'est plus</span>
        <span className="block text-[#8C8C8C]">partagé.</span>
      </h1>

      <p className="text-[15px] sm:text-[17px] text-discreet max-w-[420px] mb-8 font-normal">
        Le propriétaire a désactivé ce lien ou l'arbre n'existe plus.
      </p>

      <Button
        variant="primary"
        arrow
        onClick={() => navigate('/nouvelle-famille')}
        className="h-[52px] px-8 text-[15px]"
      >
        Créer ma famille
      </Button>
    </div>
  );
};
