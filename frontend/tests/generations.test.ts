import { describe, it, expect } from 'vitest';
import { computeGenerations } from '../src/lib/generations.js';
import { Person, Union } from '../src/shared/index.js';

const p = (id: string, parentUnionId: string | null = null): Person => ({
  id,
  firstName: id,
  lastName: 'X',
  gender: 'M',
  birthDate: null,
  deathDate: null,
  isDeceased: false,
  roleLabel: null,
  photoUrl: null,
  parentUnionId,
});

describe('computeGenerations', () => {
  it('attribue la génération 0 aux racines et incrémente pour les enfants', () => {
    const gens = computeGenerations([p('p1'), p('p2'), p('c1', 'u1')], [{ id: 'u1', partnerIds: ['p1', 'p2'] }]);
    expect(gens.get('p1')).toBe(0);
    expect(gens.get('p2')).toBe(0);
    expect(gens.get('c1')).toBe(1);
  });

  it('donne à un conjoint « venu de l’extérieur » la génération de son partenaire', () => {
    const unions: Union[] = [
      { id: 'u1', partnerIds: ['pere', 'mere'] },
      { id: 'u2', partnerIds: ['fille', 'gendre'] },
      { id: 'u3', partnerIds: ['petite', 'petit-gendre'] },
    ];
    const persons = [
      p('pere'), p('mere'), p('fille', 'u1'), p('gendre'),
      p('petite', 'u2'), p('petit-gendre'), p('arriere', 'u3'),
    ];
    const gens = computeGenerations(persons, unions);
    expect(gens.get('gendre')).toBe(1);
    expect(gens.get('petit-gendre')).toBe(2);
    expect(gens.get('arriere')).toBe(3);
  });

  it('prend la génération la plus basse quand les deux conjoints ont des parents', () => {
    const unions: Union[] = [
      { id: 'u1', partnerIds: ['a', 'b'] },
      { id: 'u2', partnerIds: ['c', 'x'] },
      { id: 'u3', partnerIds: ['c2', 'y'] },
    ];
    // x est de génération 0, c de génération 1 : le couple c+x est sur la rangée 1
    const gens = computeGenerations([p('a'), p('b'), p('c', 'u1'), p('x'), p('c2', 'u1'), p('y')], unions);
    expect(gens.get('x')).toBe(1);
  });

  it('termine sur un cycle de filiation', () => {
    const gens = computeGenerations([p('a', 'u2'), p('b', 'u1')], [
      { id: 'u1', partnerIds: ['a'] },
      { id: 'u2', partnerIds: ['b'] },
    ]);
    expect(gens.size).toBe(2);
  });
});
