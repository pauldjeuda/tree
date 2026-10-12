import React, { useState } from 'react';
import { Person, TreeSnapshot } from '../../shared/index.js';
import { useTreeStore } from '../../store/useTreeStore.js';
import { familiesApi } from '../../api/families.js';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';

interface MembersListProps {
  snapshot: TreeSnapshot;
}

export const MembersList: React.FC<MembersListProps> = ({ snapshot }) => {
  const {
    selectPersonForEdit,
    setSnapshot,
    setSaveStatus,
    setErrorMessage,
  } = useTreeStore();

  const [query, setQuery] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Person | null>(null);

  const filtered = snapshot.persons.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName} ${p.roleLabel || ''}`.toLowerCase();
    return fullName.includes(query.toLowerCase());
  });

  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      setSaveStatus('saving');
      const updated = await familiesApi.deletePerson(
        snapshot.family.id,
        memberToDelete.id
      );
      setSnapshot(updated);
      setMemberToDelete(null);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-3 text-left">
      {/* Search Input 44px */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-discreet" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un membre"
          className="w-full h-[44px] bg-white border border-[#E3E3E3] rounded-field pl-10 pr-4 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </div>

      {/* Member rows of 64px */}
      <div className="space-y-1 max-h-[580px] overflow-y-auto pr-1">
        {filtered.map((person) => {
          const initials = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();

          return (
            <div
              key={person.id}
              onClick={() => selectPersonForEdit(person.id)}
              className="group flex items-center justify-between h-[64px] px-3 rounded-[16px] hover:bg-ghost cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Avatar 40px */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#E6E8E7] flex items-center justify-center flex-shrink-0">
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt={person.firstName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[14px] font-medium text-[#555]">
                      {initials}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div>
                  <p className="text-[15px] font-sans font-semibold text-ink leading-tight">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-[13px] text-discreet leading-tight">
                    {person.roleLabel || 'Membre'}
                  </p>
                </div>
              </div>

              {/* Hover / Touch actions */}
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  title="Modifier"
                  aria-label="Modifier"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectPersonForEdit(person.id);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-discreet hover:text-ink hover:bg-black/5"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Supprimer"
                  aria-label="Supprimer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMemberToDelete(person);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-discreet hover:text-danger hover:bg-danger/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-[14px] text-discreet py-8">
            Aucun membre trouvé
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        title={`Supprimer ${memberToDelete?.firstName} de l'arbre ?`}
      >
        <p className="text-[15px] text-discreet mb-6 leading-relaxed">
          Ses liens seront retirés, ses enfants resteront dans l'arbre.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMemberToDelete(null)}
            className="h-[44px]"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            className="h-[44px]"
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
};
