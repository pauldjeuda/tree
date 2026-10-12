import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { familiesApi } from '../api/families.js';
import { extractAndStoreTokenFromHash, getEditTokenForFamily } from '../lib/localFamilies.js';
import { useTreeStore } from '../store/useTreeStore.js';
import { EditorPanel } from '../components/editor/EditorPanel.js';
import { EditorCanvas } from '../components/tree/EditorCanvas.js';
import { AlertCircle, X, Edit3 } from 'lucide-react';

export const Editor: React.FC = () => {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();

  const {
    snapshot,
    setSnapshot,
    errorMessage,
    setErrorMessage,
    isPanelCollapsed,
    togglePanelCollapsed,
  } = useTreeStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      navigate('/');
      return;
    }

    // Extract edit token from URL fragment if present (e.g. /e/:id#token)
    extractAndStoreTokenFromHash(familyId);
    const token = getEditTokenForFamily(familyId);

    if (!token) {
      console.warn('Aucun jeton d’édition trouvé pour cette famille.');
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await familiesApi.getFamily(familyId);
        setSnapshot(data);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Impossible de charger la famille');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [familyId, navigate, setSnapshot, setErrorMessage]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-paper">
        <div className="w-10 h-10 border-3 border-ink border-t-coral rounded-full animate-spin mb-4" />
        <p className="text-[15px] font-sans text-discreet">Chargement de votre arbre…</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-paper p-6 text-center">
        <h2 className="text-[24px] font-sans font-semibold text-ink mb-2">
          Famille introuvable
        </h2>
        <p className="text-[15px] text-discreet mb-6">
          Vérifiez que votre lien d'accès est correct.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-ink text-white rounded-pill text-[14px]"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-paper">
      {/* Toast Error Notification */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-danger text-white px-5 py-3 rounded-card shadow-modal animate-in fade-in slide-in-from-top-4 max-w-[90vw]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-[14px] font-medium truncate">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Left Panel */}
      <EditorPanel snapshot={snapshot} />

      {/* Floating bottom thumb-friendly button for mobile when panel is collapsed */}
      {isPanelCollapsed && (
        <button
          onClick={togglePanelCollapsed}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-white px-5 py-3 rounded-pill shadow-modal text-[14px] font-medium flex items-center gap-2 hover:bg-[#333] transition-all animate-in fade-in"
        >
          <Edit3 className="w-4 h-4 text-coral" />
          <span>Gérer les membres</span>
        </button>
      )}

      {/* Canvas Area (Background & Live Tree) */}
      <div className="w-full h-full">
        <EditorCanvas snapshot={snapshot} />
      </div>
    </div>
  );
};
