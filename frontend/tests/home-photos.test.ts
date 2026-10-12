import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('page d’accueil : photos', () => {
  const home = readFileSync(join(__dirname, '../src/pages/Home.tsx'), 'utf8');

  it('utilise une photo différente par cadre (13 cadres) et plus aucun dessin généré', () => {
    expect(home).not.toContain('createPortraitSvg');
    const used = [...home.matchAll(/portrait\((\d+)\)/g)].map((m) => Number(m[1]));
    expect(used.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('a bien un fichier pour chaque photo référencée', () => {
    for (let n = 1; n <= 13; n++) {
      const file = join(__dirname, `../public/portraits/p${String(n).padStart(2, '0')}.webp`);
      expect(existsSync(file), `public/portraits/p${n}.webp manquant`).toBe(true);
    }
  });

  it('le bouton « exemple » mène à une route qui existe', () => {
    const router = readFileSync(join(__dirname, '../src/router.tsx'), 'utf8');
    for (const [, target] of home.matchAll(/navigate\('(\/[^']*)'\)/g)) {
      expect(router, `route ${target}`).toContain(`path: '${target}'`);
    }
  });
});
