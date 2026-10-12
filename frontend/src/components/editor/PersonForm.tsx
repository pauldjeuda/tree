import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreatePersonDto,
  CreatePersonSchema,
  Gender,
  RelationType,
  MAX_PHOTO_BYTES,
  TreeSnapshot,
} from '../../shared/index.js';
import { useTreeStore } from '../../store/useTreeStore.js';
import { familiesApi } from '../../api/families.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Switch } from '../ui/Switch.js';
import { Modal } from '../ui/Modal.js';
import { Camera } from 'lucide-react';

interface PersonFormProps {
  snapshot: TreeSnapshot;
}

export const PersonForm: React.FC<PersonFormProps> = ({ snapshot }) => {
  const {
    mode,
    setMode,
    selectedId,
    setSelectedId,
    relationDraft,
    setRelationDraft,
    setSnapshot,
    setSaveStatus,
    setErrorMessage,
  } = useTreeStore();

  const isEditMode = mode === 'edit';
  const existingPersons = snapshot.persons;
  const isTreeEmpty = existingPersons.length === 0;

  // Selected person for editing
  const editingPerson = isEditMode
    ? existingPersons.find((p) => p.id === selectedId)
    : undefined;

  // Form states
  const [gender, setGender] = useState<Gender>('M');
  const [isDeceased, setIsDeceased] = useState(false);
  const [relationType, setRelationType] = useState<RelationType>('child_of');
  const [targetId, setTargetId] = useState<string>('');
  const [otherParentId, setOtherParentId] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePersonDto>({
    resolver: zodResolver(CreatePersonSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'M',
      isDeceased: false,
      roleLabel: '',
    },
  });

  // Pre-fill relation draft when user clicked on "+" button from canvas
  useEffect(() => {
    if (relationDraft) {
      setRelationType(relationDraft.type);
      setTargetId(relationDraft.targetId);
      setValue('relation', {
        type: relationDraft.type,
        targetId: relationDraft.targetId,
      });
    } else if (existingPersons.length > 0 && !targetId) {
      setTargetId(existingPersons[0].id);
    }
  }, [relationDraft, existingPersons, targetId, setValue]);

  // Sync form when editing person changes
  useEffect(() => {
    if (isEditMode && editingPerson) {
      setValue('firstName', editingPerson.firstName);
      setValue('lastName', editingPerson.lastName);
      setValue('roleLabel', editingPerson.roleLabel || '');
      setValue('birthDate', editingPerson.birthDate || '');
      setValue('deathDate', editingPerson.deathDate || '');
      setGender(editingPerson.gender);
      setIsDeceased(editingPerson.isDeceased);
      setPreviewPhoto(editingPerson.photoUrl || null);
      setIsPhotoRemoved(false);
    } else if (!isEditMode) {
      handleReset();
    }
  }, [isEditMode, editingPerson, setValue]);

  const handleReset = () => {
    reset({
      firstName: '',
      lastName: '',
      gender: 'M',
      isDeceased: false,
      roleLabel: '',
      birthDate: '',
      deathDate: '',
    });
    setGender('M');
    setIsDeceased(false);
    setPreviewPhoto(null);
    setPhotoFile(null);
    setIsPhotoRemoved(false);
    setRelationDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenderChange = (val: Gender) => {
    setGender(val);
    setValue('gender', val);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMessage('La photo ne doit pas dépasser 4 Mo');
      return;
    }

    setPhotoFile(file);
    setIsPhotoRemoved(false);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: CreatePersonDto) => {
    try {
      setIsSubmitting(true);
      setSaveStatus('saving');

      const payload: CreatePersonDto = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        roleLabel: data.roleLabel?.trim() || null,
        gender,
        isDeceased,
        birthDate: data.birthDate ? data.birthDate : null,
        deathDate: isDeceased && data.deathDate ? data.deathDate : null,
      };

      if (!isTreeEmpty && !isEditMode) {
        payload.relation = {
          type: relationType,
          targetId: targetId || existingPersons[0]?.id,
          otherParentId: otherParentId || undefined,
        };
      }

      if (isEditMode && editingPerson) {
        const updated = await familiesApi.updatePerson(
          snapshot.family.id,
          editingPerson.id,
          payload
        );
        if (photoFile) {
          await familiesApi.uploadPhoto(snapshot.family.id, editingPerson.id, photoFile);
          const refreshed = await familiesApi.getFamily(snapshot.family.id);
          setSnapshot(refreshed);
        } else if (isPhotoRemoved) {
          await familiesApi.deletePhoto(snapshot.family.id, editingPerson.id);
          const refreshed = await familiesApi.getFamily(snapshot.family.id);
          setSnapshot(refreshed);
        } else {
          setSnapshot(updated);
        }
      } else {
        const knownIds = new Set(snapshot.persons.map((p) => p.id));
        const updated = await familiesApi.addPerson(snapshot.family.id, payload);
        // La nouvelle personne est celle dont l'identifiant était inconnu (ne dépend pas de l'ordre de la liste).
        const newPerson = updated.persons.find((p) => !knownIds.has(p.id));
        if (photoFile && newPerson) {
          await familiesApi.uploadPhoto(snapshot.family.id, newPerson.id, photoFile);
          const refreshed = await familiesApi.getFamily(snapshot.family.id);
          setSnapshot(refreshed);
        } else {
          setSnapshot(updated);
        }
        handleReset();
      }

      setSaveStatus('saved');
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPerson) return;
    try {
      setIsSubmitting(true);
      setSaveStatus('saving');
      const updated = await familiesApi.deletePerson(
        snapshot.family.id,
        editingPerson.id
      );
      setSnapshot(updated);
      setSelectedId(null);
      setMode('add');
      setIsDeleteModalOpen(false);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Échec de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 text-left pb-1">


      {/* Mode Modifier title */}
      {isEditMode && editingPerson && (
        <div className="flex items-center justify-between pb-1 border-b border-hairline">
          <h3 className="text-[14px] font-sans font-semibold text-ink">
            Modifier {editingPerson.firstName}
          </h3>
          <button
            type="button"
            onClick={() => {
              setMode('add');
              setSelectedId(null);
            }}
            className="text-[11px] text-discreet hover:text-ink"
          >
            Nouveau membre
          </button>
        </div>
      )}

      {/* 1. Photo circle 44px */}
      <div className="flex items-center gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-[44px] h-[44px] rounded-full border-[1.5px] border-dashed border-[#CFCFCF] hover:border-ink cursor-pointer overflow-hidden flex flex-col items-center justify-center bg-[#FAFAFA] flex-shrink-0 transition-all"
        >
          {previewPhoto ? (
            <img
              src={previewPhoto}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-4 h-4 text-discreet hover:text-ink transition-colors" />
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-[12px] font-sans font-medium text-ink leading-tight">
            Photo <span className="text-discreet font-normal text-[11px]">(facultatif)</span>
          </p>
          <p className="text-[11px] text-discreet leading-tight">JPG, PNG ou WebP, 4 Mo max</p>
          {previewPhoto && (
            <button
              type="button"
              onClick={() => {
                setPreviewPhoto(null);
                setPhotoFile(null);
                setIsPhotoRemoved(Boolean(editingPerson?.photoUrl));
              }}
              className="text-[11px] text-danger hover:underline block mt-0.5"
            >
              Retirer
            </button>
          )}
        </div>
      </div>

      {/* 2. Prénom* & Nom* (2 columns) */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Prénom*"
          placeholder="Ex. Joseph"
          compact
          {...register('firstName')}
          error={errors.firstName?.message}
        />
        <Input
          label="Nom*"
          placeholder="Ex. Mballa"
          compact
          {...register('lastName')}
          error={errors.lastName?.message}
        />
      </div>

      {/* 3. Sexe & Date de naissance (2 columns) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[12px] font-sans font-medium text-ink block mb-1">
            Sexe
          </label>
          <div className="grid grid-cols-2 gap-1 h-[38px] bg-ghost p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => handleGenderChange('M')}
              className={`rounded-lg text-[12px] font-medium transition-colors ${
                gender === 'M' ? 'bg-[#111] text-white shadow-sm' : 'text-ink'
              }`}
            >
              Homme
            </button>
            <button
              type="button"
              onClick={() => handleGenderChange('F')}
              className={`rounded-lg text-[12px] font-medium transition-colors ${
                gender === 'F' ? 'bg-[#111] text-white shadow-sm' : 'text-ink'
              }`}
            >
              Femme
            </button>
          </div>
        </div>
        <Input
          label="Date de naissance"
          type="date"
          compact
          {...register('birthDate')}
          error={errors.birthDate?.message}
        />
      </div>

      {/* 4. Rôle affiché (select) & Décédé(e) toggle on the same line */}
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-7">
          <label className="text-[12px] font-sans font-medium text-ink block mb-1">
            Rôle affiché
          </label>
          <select
            {...register('roleLabel')}
            className="w-full h-[34px] bg-white border border-[#E3E3E3] rounded-xl px-2.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-ink appearance-none"
          >
            <option value="">— Aucun —</option>
            <option value="Père">Père</option>
            <option value="Mère">Mère</option>
            <option value="Grand-père">Grand-père</option>
            <option value="Grand-mère">Grand-mère</option>
            <option value="Fils">Fils</option>
            <option value="Fille">Fille</option>
            <option value="Frère">Frère</option>
            <option value="Sœur">Sœur</option>
            <option value="Oncle">Oncle</option>
            <option value="Tante">Tante</option>
            <option value="Neveu">Neveu</option>
            <option value="Nièce">Nièce</option>
            <option value="Cousin">Cousin</option>
            <option value="Cousine">Cousine</option>
            <option value="Époux">Époux</option>
            <option value="Épouse">Épouse</option>
            <option value="Beau-père">Beau-père</option>
            <option value="Belle-mère">Belle-mère</option>
            <option value="Beau-fils">Beau-fils</option>
            <option value="Belle-fille">Belle-fille</option>
            <option value="Arrière-grand-père">Arrière-grand-père</option>
            <option value="Arrière-grand-mère">Arrière-grand-mère</option>
            <option value="Patriarche">Patriarche</option>
            <option value="Matriarche">Matriarche</option>
          </select>
          {errors.roleLabel && (
            <p className="text-[11px] text-danger mt-0.5">{errors.roleLabel.message}</p>
          )}
        </div>
        <div className="col-span-5 pb-1">
          <Switch
            checked={isDeceased}
            onChange={setIsDeceased}
            label="Décédé(e)"
            compact
          />
        </div>
      </div>

      {/* Date de décès si coché */}
      {isDeceased && (
        <div className="animate-in fade-in">
          <Input
            label="Date de décès"
            type="date"
            compact
            {...register('deathDate')}
            error={errors.deathDate?.message}
          />
        </div>
      )}

      {/* 5. Section RELATION (uniquement si arbre non vide) */}
      {!isTreeEmpty && !isEditMode && (
        <div className="pt-2 border-t border-hairline space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold tracking-wider text-[#6B6B6B] uppercase">
              RELATION
            </span>
            <span className="text-[11px] font-medium text-discreet">
              Lié à un membre
            </span>
          </div>

          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full h-[36px] bg-white border border-[#E3E3E3] rounded-xl px-2.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-ink"
          >
            {existingPersons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} {p.roleLabel ? `(${p.roleLabel})` : ''}
              </option>
            ))}
          </select>

          {/* 4 relation type buttons in 2x2 grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { type: 'child_of', label: 'Enfant de' },
                { type: 'parent_of', label: 'Parent de' },
                { type: 'spouse_of', label: 'Conjoint(e) de' },
                { type: 'sibling_of', label: 'Frère / sœur de' },
              ] as const
            ).map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setRelationType(item.type)}
                className={`h-[32px] rounded-lg text-[12px] font-medium border transition-colors ${
                  relationType === item.type
                    ? 'bg-[#111] text-white border-[#111]'
                    : 'bg-white text-ink border-hairline hover:bg-ghost'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {relationType === 'child_of' && existingPersons.length > 1 && (
            <div className="pt-0.5">
              <label className="text-[11px] font-sans font-medium text-ink block mb-0.5">
                Autre parent (facultatif)
              </label>
              <select
                value={otherParentId}
                onChange={(e) => setOtherParentId(e.target.value)}
                className="w-full h-[34px] bg-white border border-[#E3E3E3] rounded-xl px-2.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-ink"
              >
                <option value="">Aucun ou parent seul</option>
                {existingPersons
                  .filter((p) => p.id !== targetId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 6. Bouton d'action submit (immédiatement visible sans scroll) */}
      <div className="pt-1.5 space-y-1">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="w-full h-[42px] text-[13px] font-medium shadow-sm justify-center"
        >
          {isEditMode
            ? 'Enregistrer les modifications'
            : isTreeEmpty
            ? 'Ajouter la première personne'
            : "Ajouter à l'arbre"}
        </Button>

        {isEditMode ? (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full text-center text-[12px] text-danger hover:underline py-0.5"
          >
            Supprimer ce membre
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-[11px] text-discreet hover:text-ink py-0.5"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Modal Confirmation de suppression */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Supprimer ${editingPerson?.firstName || ''} de l'arbre ?`}
      >
        <p className="text-[14px] text-discreet mb-5 leading-relaxed">
          Ses liens seront retirés, ses enfants resteront dans l'arbre.
        </p>
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(false)}
            className="h-[40px] text-sm"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            className="h-[40px] text-sm"
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </form>
  );
};
