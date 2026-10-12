export interface LocalFamilyRecord {
  id: string;
  name: string;
  editToken: string;
}

const STORAGE_KEY = 'tree:families';

export function getLocalFamilies(): LocalFamilyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalFamilyRecord[];
  } catch {
    return [];
  }
}

export function saveLocalFamily(record: LocalFamilyRecord): void {
  try {
    const list = getLocalFamilies();
    const existingIndex = list.findIndex((item) => item.id === record.id);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Erreur sauvegarde localStorage:', err);
  }
}

export function getEditTokenForFamily(familyId: string): string | null {
  const list = getLocalFamilies();
  const match = list.find((item) => item.id === familyId);
  return match ? match.editToken : null;
}

export function extractAndStoreTokenFromHash(familyId: string): string | null {
  const hash = window.location.hash.replace(/^#/, '').trim();
  if (hash) {
    saveLocalFamily({
      id: familyId,
      name: '',
      editToken: hash,
    });
    // Remove token from URL hash without reloading page
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return hash;
  }
  return getEditTokenForFamily(familyId);
}
