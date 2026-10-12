import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TreeSnapshot } from '../../shared/index.js';
import { useTreeStore } from '../../store/useTreeStore.js';
import { PersonForm } from './PersonForm.js';
import { MembersList } from './MembersList.js';
import { ArrowLeft, ChevronsLeft, ChevronsRight, ArrowRight } from 'lucide-react';

interface EditorPanelProps {
  snapshot: TreeSnapshot;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ snapshot }) => {
  const navigate = useNavigate();
  const {
    mode,
    setMode,
    isPanelCollapsed,
    togglePanelCollapsed,
  } = useTreeStore();

  const count = snapshot.persons.length;

  if (isPanelCollapsed) {
    return (
      <div className="absolute top-3.5 left-3.5 z-40 flex items-center gap-2">
        <button
          onClick={togglePanelCollapsed}
          title="Ouvrir le panneau"
          aria-label="Ouvrir le panneau"
          className="w-10 h-10 rounded-full bg-white shadow-card border border-hairline flex items-center justify-center text-ink hover:bg-ghost transition-all"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 sm:top-3 left-0 sm:left-3 z-40 w-full sm:w-[380px] md:w-[410px] max-w-[410px] h-full sm:h-[calc(100vh-24px)] sm:max-h-[820px] bg-white rounded-none sm:rounded-panel border-r sm:border border-hairline shadow-panel flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200"
    >
      {/* 1. Compact Header */}
      <div className="h-[48px] px-3.5 sm:px-4 flex items-center justify-between border-b border-hairline flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            title="Retour à l'accueil"
            aria-label="Retour à l'accueil"
            className="w-7 h-7 rounded-full border border-hairline flex items-center justify-center text-ink hover:bg-ghost transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="overflow-hidden">
            <h2 className="text-[14px] font-sans font-semibold text-ink leading-tight truncate">
              {snapshot.family.name || 'Famille'}
            </h2>
            <p className="text-[11px] text-discreet leading-none">
              {count} {count > 1 ? 'membres' : 'membre'}
            </p>
          </div>
        </div>

        {/* Action Header Button: Voir l'arbre & Collapse */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/e/${snapshot.family.id}/arbre`)}
            className="h-[30px] px-2.5 rounded-pill bg-ink text-white hover:bg-[#333] text-[12px] font-medium transition-colors flex items-center gap-1 shadow-sm"
            title="Terminer et voir l'arbre complet"
            aria-label="Terminer et voir l'arbre complet"
          >
            <span>Voir l'arbre</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={togglePanelCollapsed}
            title="Replier le panneau"
            aria-label="Replier le panneau"
            className="w-7 h-7 rounded-full border border-hairline flex items-center justify-center text-discreet hover:text-ink hover:bg-ghost transition-colors flex-shrink-0"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Compact Tabs */}
      <div className="px-3.5 sm:px-4 pt-2 pb-1.5 flex-shrink-0">
        <div className="h-[34px] bg-[#F3F3F3] rounded-pill p-0.5 grid grid-cols-2 gap-1">
          <button
            onClick={() => setMode('add')}
            className={`h-full rounded-pill text-[12px] font-sans font-medium transition-all ${
              mode === 'add' || mode === 'edit'
                ? 'bg-white text-ink shadow-sm'
                : 'text-discreet hover:text-ink'
            }`}
          >
            {mode === 'edit' ? 'Modifier' : 'Ajouter'}
          </button>
          <button
            onClick={() => setMode('members')}
            className={`h-full rounded-pill text-[12px] font-sans font-medium transition-all ${
              mode === 'members'
                ? 'bg-white text-ink shadow-sm'
                : 'text-discreet hover:text-ink'
            }`}
          >
            Membres ({count})
          </button>
        </div>
      </div>

      {/* 3. Form / Members Area (Full height available, no obstructive bottom footer) */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-2">
        {mode === 'members' ? (
          <MembersList snapshot={snapshot} />
        ) : (
          <PersonForm snapshot={snapshot} />
        )}
      </div>
    </div>
  );
};
