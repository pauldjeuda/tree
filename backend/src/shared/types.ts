export type Gender = 'M' | 'F';

export interface Person {
  id: string;
  familyId?: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  isDeceased: boolean;
  roleLabel: string | null;
  photoUrl: string | null;
  parentUnionId: string | null;
}

export interface Union {
  id: string;
  familyId?: string;
  partnerIds: string[];
}

export interface Family {
  id: string;
  name: string;
  subtitle: string;
  shareId?: string | null;
  shareActive?: boolean;
}

export interface TreeSnapshot {
  family: {
    id: string;
    name: string;
    subtitle: string;
    /** Date de création (ISO) : sert à afficher « mois année » sur l'affiche. */
    createdAt?: string;
    shareId?: string | null;
    shareActive?: boolean;
  };
  persons: Person[];
  unions: Union[];
}

export type RelationType = 'child_of' | 'parent_of' | 'spouse_of' | 'sibling_of';

export interface RelationInput {
  type: RelationType;
  targetId: string;
  /** child_of : l'autre parent de l'enfant (sert à choisir la bonne union). */
  otherParentId?: string;
  /** child_of : union précise de la personne cible. */
  unionId?: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'SHARE_INACTIVE'
  | 'AMBIGUOUS_UNION'
  | 'PARENT_SLOTS_FULL'
  | 'CYCLE_DETECTED'
  | 'LIMIT_REACHED'
  | 'FILE_TOO_LARGE'
  | 'FILE_INVALID'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown[];
  };
}

export interface CreateFamilyResponse {
  snapshot: TreeSnapshot;
  editToken: string;
}

export interface ShareResponse {
  shareId: string | null;
  url: string | null;
  active: boolean;
}
