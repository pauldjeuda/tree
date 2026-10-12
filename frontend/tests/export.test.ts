import { describe, it, expect } from 'vitest';
import { PDF_LONG_SIDE_MM, pdfPageSize, slugify } from '../src/lib/export.js';
import { formatPosterSubtitle } from '../src/lib/format.js';

describe('pdfPageSize', () => {
  it('conserve exactement les proportions de l’affiche (pas de déformation)', () => {
    for (const [w, h] of [[1040, 780], [1411, 800], [800, 1200], [1000, 1000]] as const) {
      const { pageWidth, pageHeight } = pdfPageSize(w, h);
      expect(pageWidth / pageHeight).toBeCloseTo(w / h, 2);
      expect(Math.max(pageWidth, pageHeight)).toBe(PDF_LONG_SIDE_MM);
    }
  });
});

describe('slugify', () => {
  it('produit un nom de fichier sûr', () => {
    expect(slugify('Famille Mballa-Étoundi / 2026')).toBe('famille-mballa-etoundi-2026');
  });
});

describe('formatPosterSubtitle', () => {
  it('utilise le mois et l’année de création', () => {
    expect(formatPosterSubtitle('2026-03-12T10:00:00Z', 'Arbre généalogique')).toBe('Mars 2026 | Arbre généalogique');
  });
  it('retombe sur un sous-titre par défaut', () => {
    expect(formatPosterSubtitle('2026-10-01T10:00:00Z', '  ')).toBe('Octobre 2026 | Arbre généalogique');
  });
});
