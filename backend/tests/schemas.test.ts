import { describe, expect, it } from 'vitest';
import {
  CreateFamilySchema,
  CreatePersonSchema,
  UpdatePersonSchema,
  RelationInputSchema,
} from '../src/shared/index.js';

const base = { firstName: 'Awa', lastName: 'Mballa', gender: 'F' as const };

describe('CreateFamilySchema', () => {
  it('nettoie le nom et applique le sous-titre par défaut', () => {
    const r = CreateFamilySchema.parse({ name: '  Famille Mballa ', subtitle: '   ' });
    expect(r.name).toBe('Famille Mballa');
    expect(r.subtitle).toBe('Arbre généalogique');
  });
  it('refuse un nom vide ou trop long', () => {
    expect(CreateFamilySchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(CreateFamilySchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false);
  });
});

describe('CreatePersonSchema', () => {
  it('accepte une personne minimale et convertit les dates vides en null', () => {
    const r = CreatePersonSchema.parse({ ...base, birthDate: '', deathDate: '', roleLabel: ' ' });
    expect(r.birthDate).toBeNull();
    expect(r.roleLabel).toBeNull();
    expect(r.isDeceased).toBe(false);
  });
  it('refuse les dates inexistantes', () => {
    for (const birthDate of ['2024-13-45', '2023-02-30', '99-01-01']) {
      expect(CreatePersonSchema.safeParse({ ...base, birthDate }).success).toBe(false);
    }
    expect(CreatePersonSchema.safeParse({ ...base, birthDate: '2024-02-29' }).success).toBe(true);
  });
  it('refuse un décès avant la naissance', () => {
    const r = CreatePersonSchema.safeParse({ ...base, birthDate: '2000-05-01', deathDate: '1999-01-01' });
    expect(r.success).toBe(false);
  });
  it("ignore silencieusement photoUrl : une URL ne peut pas être imposée par le client", () => {
    const r = CreatePersonSchema.parse({ ...base, photoUrl: 'https://tracker.example/pixel.png' });
    expect('photoUrl' in r).toBe(false);
  });
  it('exige des identifiants valides dans la relation', () => {
    expect(CreatePersonSchema.safeParse({ ...base, relation: { type: 'child_of', targetId: 'abc' } }).success).toBe(false);
    expect(
      RelationInputSchema.safeParse({ type: 'child_of', targetId: '3f1c2a7e-5b6d-4c8e-9a10-2b3c4d5e6f70' }).success,
    ).toBe(true);
  });
});

describe('UpdatePersonSchema', () => {
  it('refuse un corps vide', () => {
    expect(UpdatePersonSchema.safeParse({}).success).toBe(false);
    expect(UpdatePersonSchema.safeParse({ firstName: 'Léa' }).success).toBe(true);
  });
});
