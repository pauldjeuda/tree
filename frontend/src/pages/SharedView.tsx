import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateMballaDemoSnapshot, TreeSnapshot } from '../shared/index.js';
import { ChevronDown, Download, Eye } from 'lucide-react';
import { ApiRequestError } from '../api/client.js';
import { familiesApi } from '../api/families.js';
import { PosterViewer } from '../components/tree/PosterViewer.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { PageError, PageLoader } from '../components/ui/PageStatus.js';
import { DownloadMenu } from '../components/editor/DownloadMenu.js';
import { exportPosterAsPdf, exportPosterAsPng } from '../lib/export.js';
import { InactiveLink } from './InactiveLink.js';

/** `demo` : affiche l'arbre d'exemple (Famille Mballa) sans appeler l'API. */
export const SharedView: React.FC<{ demo?: boolean }> = ({ demo = false }) => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<TreeSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'inactive' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demo) {
      setSnapshot(generateMballaDemoSnapshot());
      setStatus('ready');
      return;
    }
    if (!shareId) {
      setStatus('inactive');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    familiesApi
      .getPublicTree(shareId)
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setStatus('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // 404 (inconnu) et 410 (lien désactivé) : même écran « lien inactif ».
        if (err instanceof ApiRequestError && (err.status === 404 || err.status === 410)) setStatus('inactive');
        else {
          setErrorMessage(err.message);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shareId, attempt, demo]);

  const handleDownloadPng = async () => {
    if (posterRef.current && snapshot) await exportPosterAsPng(posterRef.current, snapshot.family.name);
  };
  const handleDownloadPdf = async () => {
    if (posterRef.current && snapshot) await exportPosterAsPdf(posterRef.current, snapshot.family.name);
  };

  if (status === 'loading') return <PageLoader />;
  if (status === 'inactive') return <InactiveLink />;
  if (status === 'error' || !snapshot) {
    return (
      <PageError
        title="Impossible d'afficher l'arbre"
        message={errorMessage || 'Une erreur est survenue.'}
        actionLabel="Réessayer"
        onAction={() => setAttempt((n) => n + 1)}
      />
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#F7F7F7] flex flex-col items-center overflow-hidden">
      <header className="h-[64px] sm:h-[72px] bg-white/85 backdrop-blur-md border-b border-hairline px-3 sm:px-6 md:px-8 flex items-center justify-between z-40 w-full flex-shrink-0">
        <button type="button" onClick={() => navigate('/')} aria-label="tree, retour à l'accueil" className="flex items-center">
          <span className="text-[20px] sm:text-[22px] font-sans font-semibold tracking-tight text-ink lowercase">tree</span>
          <span className="w-1.5 h-1.5 rounded-full bg-coral ml-0.5 mt-1" aria-hidden="true" />
        </button>

        <div className="hidden sm:block">
          <Badge icon={<Eye className="w-4 h-4 mr-1 text-discreet" aria-hidden="true" />}>{demo ? 'Exemple' : 'Lecture seule'}</Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              aria-haspopup="menu"
              aria-expanded={isDownloadOpen}
              aria-label="Télécharger l'arbre"
              className="inline-flex items-center gap-1.5 sm:gap-2 h-[38px] sm:h-[44px] px-3 sm:px-5 rounded-pill bg-white text-ink border border-[#E0E0E0] text-[13px] sm:text-[14px] font-sans font-medium hover:bg-[#F9F9F9] transition-colors"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Télécharger</span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-discreet" aria-hidden="true" />
            </button>
            <DownloadMenu
              isOpen={isDownloadOpen}
              onClose={() => setIsDownloadOpen(false)}
              onDownloadPng={handleDownloadPng}
              onDownloadPdf={handleDownloadPdf}
            />
          </div>

          <Button variant="primary" arrow onClick={() => navigate('/nouvelle-famille')} className="h-[38px] sm:h-[44px] px-3 sm:px-6 text-[13px] sm:text-[14px]">
            <span className="hidden sm:inline">Créer ma famille</span>
            <span className="sm:hidden">Créer</span>
          </Button>
        </div>
      </header>

      <PosterViewer snapshot={snapshot} posterRef={posterRef} />
    </div>
  );
};
