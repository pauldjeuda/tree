import { describe, it, expect } from 'vitest';
import { generateMballaDemoSnapshot } from '../src/shared/index.js';

describe('démo', () => {
  it('génère un arbre cohérent', () => {
    const s = generateMballaDemoSnapshot();
    expect(s.persons.length).toBeGreaterThan(10);
    const unionIds = new Set(s.unions.map((u) => u.id));
    for (const p of s.persons) if (p.parentUnionId) expect(unionIds.has(p.parentUnionId)).toBe(true);
  });
});
