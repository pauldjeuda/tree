import {
  CreateFamilyDto,
  CreateFamilyResponse,
  CreatePersonDto,
  Person,
  ShareResponse,
  TreeSnapshot,
  UpdateFamilyDto,
  UpdatePersonDto,
} from '../shared/index.js';
import { apiFetch } from './client.js';

export const familiesApi = {
  createFamily: (data: CreateFamilyDto) =>
    apiFetch<CreateFamilyResponse>('/families', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFamily: (familyId: string) =>
    apiFetch<TreeSnapshot>(`/families/${familyId}`, { method: 'GET' }, familyId),

  updateFamily: (familyId: string, data: UpdateFamilyDto) =>
    apiFetch<TreeSnapshot>(
      `/families/${familyId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      familyId
    ),

  addPerson: (familyId: string, data: CreatePersonDto) =>
    apiFetch<TreeSnapshot>(
      `/families/${familyId}/persons`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      familyId
    ),

  updatePerson: (familyId: string, personId: string, data: UpdatePersonDto) =>
    apiFetch<TreeSnapshot>(
      `/families/${familyId}/persons/${personId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      familyId
    ),

  deletePerson: (familyId: string, personId: string) =>
    apiFetch<TreeSnapshot>(
      `/families/${familyId}/persons/${personId}`,
      { method: 'DELETE' },
      familyId
    ),

  uploadPhoto: (familyId: string, personId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiFetch<Person>(
      `/families/${familyId}/persons/${personId}/photo`,
      {
        method: 'POST',
        body: formData,
      },
      familyId
    );
  },

  deletePhoto: (familyId: string, personId: string) =>
    apiFetch<Person>(
      `/families/${familyId}/persons/${personId}/photo`,
      { method: 'DELETE' },
      familyId
    ),

  createOrActivateShare: (familyId: string) =>
    apiFetch<ShareResponse>(
      `/families/${familyId}/share`,
      { method: 'POST' },
      familyId
    ),

  updateShare: (familyId: string, active: boolean) =>
    apiFetch<ShareResponse>(
      `/families/${familyId}/share`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      },
      familyId
    ),

  getPublicTree: (shareId: string) =>
    apiFetch<TreeSnapshot>(`/public/f/${shareId}`, { method: 'GET' }),
};
