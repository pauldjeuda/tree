import { z } from 'zod';

/** Nombre maximal de personnes par famille. */
export const MAX_PERSONS = 500;
/** Taille maximale d'une photo envoyée (octets). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const GenderSchema = z.enum(['M', 'F'], {
  errorMap: () => ({ message: 'Choisissez le sexe.' }),
});

/** Date AAAA-MM-JJ réellement existante (2024-13-45 et 2023-02-30 sont refusées). */
const isRealDate = (v: string): boolean => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Une chaîne vide est traitée comme « pas de date ». */
export const DateStringSchema = z.preprocess(
  (v) => (v === '' ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)')
    .refine(isRealDate, "Cette date n'existe pas.")
    .nullable()
    .optional(),
);

const uuid = (message: string) => z.string().uuid(message);

export const CreateFamilySchema = z.object({
  name: z
    .string({ required_error: 'Le nom de la famille est requis' })
    .trim()
    .min(1, 'Le nom de la famille ne peut pas être vide')
    .max(80, 'Le nom ne peut pas dépasser 80 caractères'),
  subtitle: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z
      .string()
      .trim()
      .max(80, 'Le sous-titre ne peut pas dépasser 80 caractères')
      .optional()
      .default('Arbre généalogique'),
  ),
});

export const UpdateFamilySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom ne peut pas être vide')
    .max(80, 'Le nom ne peut pas dépasser 80 caractères')
    .optional(),
  subtitle: z
    .string()
    .trim()
    .max(80, 'Le sous-titre ne peut pas dépasser 80 caractères')
    .optional(),
});

export const RelationInputSchema = z.object({
  type: z.enum(['child_of', 'parent_of', 'spouse_of', 'sibling_of']),
  targetId: uuid('La personne cible est invalide'),
  otherParentId: uuid("L'autre parent est invalide").optional(),
  unionId: uuid("L'union est invalide").optional(),
});

/**
 * Champs d'une personne. La photo ne passe JAMAIS par ce schéma : elle est envoyée
 * via l'endpoint dédié, ce qui empêche d'enregistrer une URL arbitraire.
 */
export const PersonRawObject = z.object({
  firstName: z
    .string({ required_error: 'Le prénom est requis' })
    .trim()
    .min(1, 'Le prénom ne peut pas être vide')
    .max(60, 'Le prénom ne peut pas dépasser 60 caractères'),
  lastName: z
    .string({ required_error: 'Le nom est requis' })
    .trim()
    .min(1, 'Le nom ne peut pas être vide')
    .max(60, 'Le nom ne peut pas dépasser 60 caractères'),
  gender: GenderSchema,
  birthDate: DateStringSchema,
  deathDate: DateStringSchema,
  isDeceased: z.boolean().default(false),
  roleLabel: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(40, 'Le rôle ne peut pas dépasser 40 caractères').nullable().optional(),
  ),
});

const validateDates = (data: { birthDate?: string | null; deathDate?: string | null }) => {
  if (data.birthDate && data.deathDate) return data.deathDate >= data.birthDate;
  return true;
};
const datesMessage = {
  message: 'La date de décès doit être postérieure ou égale à la date de naissance',
  path: ['deathDate'],
};

export const PersonBaseSchema = PersonRawObject.refine(validateDates, datesMessage);

export const CreatePersonSchema = PersonRawObject.extend({
  relation: RelationInputSchema.optional(),
}).refine(validateDates, datesMessage);

export const UpdatePersonSchema = PersonRawObject.partial()
  .refine(validateDates, datesMessage)
  .refine((v) => Object.keys(v).length > 0, 'Aucune modification fournie.');

export const UpdateShareSchema = z.object({
  active: z.boolean({ required_error: "L'état de partage est requis" }),
});

export const UuidSchema = z.string().uuid();
export const ShareIdSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/);

export type CreateFamilyDto = z.infer<typeof CreateFamilySchema>;
export type UpdateFamilyDto = z.infer<typeof UpdateFamilySchema>;
export type CreatePersonDto = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonDto = z.infer<typeof UpdatePersonSchema>;
export type UpdateShareDto = z.infer<typeof UpdateShareSchema>;
