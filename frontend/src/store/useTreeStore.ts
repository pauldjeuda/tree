import { create } from 'zustand';
import { Person, RelationType, TreeSnapshot } from '../shared/index.js';

export type EditorMode = 'add' | 'members' | 'edit';
export type SaveStatus = 'saved' | 'saving' | 'error';

export interface RelationDraft {
  type: RelationType;
  targetId: string;
}

interface TreeStoreState {
  snapshot: TreeSnapshot | null;
  selectedId: string | null;
  mode: EditorMode;
  relationDraft: RelationDraft | null;
  saveStatus: SaveStatus;
  errorMessage: string | null;
  isPanelCollapsed: boolean;

  setSnapshot: (snapshot: TreeSnapshot | null) => void;
  setSelectedId: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setRelationDraft: (draft: RelationDraft | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setErrorMessage: (msg: string | null) => void;
  setIsPanelCollapsed: (collapsed: boolean) => void;
  togglePanelCollapsed: () => void;

  selectPersonForEdit: (id: string) => void;
  startAddRelative: (targetId: string, type: RelationType) => void;
  getSelectedPerson: () => Person | undefined;
}

export const useTreeStore = create<TreeStoreState>((set, get) => ({
  snapshot: null,
  selectedId: null,
  mode: 'add',
  relationDraft: null,
  saveStatus: 'saved',
  errorMessage: null,
  isPanelCollapsed: false,

  setSnapshot: (snapshot) => set({ snapshot }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setMode: (mode) => set({ mode }),
  setRelationDraft: (relationDraft) => set({ relationDraft }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setIsPanelCollapsed: (isPanelCollapsed) => set({ isPanelCollapsed }),
  togglePanelCollapsed: () => set((state) => ({ isPanelCollapsed: !state.isPanelCollapsed })),

  selectPersonForEdit: (id: string) => {
    set({
      selectedId: id,
      mode: 'edit',
      isPanelCollapsed: false,
    });
  },

  startAddRelative: (targetId: string, type: RelationType) => {
    set({
      selectedId: targetId,
      mode: 'add',
      relationDraft: { targetId, type },
      isPanelCollapsed: false,
    });
  },

  getSelectedPerson: () => {
    const { snapshot, selectedId } = get();
    if (!snapshot || !selectedId) return undefined;
    return snapshot.persons.find((p) => p.id === selectedId);
  },
}));
