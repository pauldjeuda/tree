import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TreeSnapshot } from '../shared/index.js';
import { ArrowLeft, ChevronDown, Download, Share2 } from 'lucide-react';
import { ApiRequestError } from '../api/client.js';
import { familiesApi } from '../api/families.js';
import { PosterViewer } from '../components/tree/PosterViewer.js';
import { Button } from '../components/ui/Button.js';
import { PageError, PageLoader } from '../components/ui/PageStatus.js';
import { DownloadMenu } from '../components/editor/DownloadMenu.js';
import { ShareDialog } from '../components/editor/ShareDialog.js';
import { exportPosterAsPdf, exportPosterAsPng } from '../lib/export.js';

export const TreeView: React.FC = () => {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<TreeSnapshot | null>(null);
  const [error, setError] = useState<ApiRequestError | Error | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!familyId) {
      navigate('/');
      return;
    }
    let cancelled = false;
    familiesApi
      .getFamily(familyId)
      .then((data) => !cancelled && setSnapshot(data))
      .catch((err: Error) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [familyId, navigate]);

  const handleDownloadPng = async () => {
    if (posterRef.current && snapshot) await exportPosterAsPng(posterRef.current, snapshot.family.name);
  };
  const handleDownloadPdf = async () => {
    if (posterRef.current && snapshot) await exportPosterAsPdf(posterRef.current, snapshot.family.name);
  };

  if (error) {
    const unauthorized = error instanceof ApiRequestError && error.status === 401;
    return (
      <PageError
        title={unauthorized ? "Lien d'édition invalide" : "Impossible d'afficher l'arbre"}
        message={
          unauthorized
            ? "Ouvrez à nouveau votre lien d'édition personnel pour retrouver cet arbre."
            : error.message
        }
        actionLabel="Retour à l'accueil"
        onAction={() => navigate('/')}
      />
    );
  }
  if (!snapshot) return <PageLoader />;

  return (
    <div className="relative w-full h-screen bg-[#F7F7F7] flex flex-col items-center overflow-hidden">
      <header className="h-[64px] sm:h-[72px] bg-white/85 backdrop-blur-md border-b border-hairline px-3 sm:px-6 md:px-8 flex items-center justify-between z-40 w-full flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate(`/e/${snapshot.family.id}`)}
          className="flex items-center gap-2 sm:gap-3 text-[14px] sm:text-[15px] font-sans font-medium text-ink hover:text-muted transition-colors"
        >
          <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-hairline flex items-center justify-center hover:bg-ghost">
            <ArrowLeft className="w-4 h-4 text-ink" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Modifier l'arbre</span>
          <span className="sm:hidden text-xs">Modifier</span>
        </button>

        <button type="button" onClick={() => navigate('/')} aria-label="tree, retour à l'accueil" className="flex items-center">
          <span className="text-[20px] sm:text-[22px] font-sans font-semibold tracking-tight text-ink lowercase">tree</span>
          <span className="w-1.5 h-1.5 rounded-full bg-coral ml-0.5 mt-1" aria-hidden="true" />
        </button>

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

          <Button variant="primary" onClick={() => setIsShareOpen(true)} className="h-[38px] sm:h-[44px] px-3 sm:px-6 text-[13px] sm:text-[14px]">
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" aria-hidden="true" />
            <span>Partager</span>
          </Button>
        </div>
      </header>

      <PosterViewer snapshot={snapshot} posterRef={posterRef} />

      <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} snapshot={snapshot} />
    </div>
  );
};
