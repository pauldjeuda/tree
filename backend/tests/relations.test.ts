import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sequelize } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrator.js';
import { Family } from '../src/db/models/index.js';
import { relationsService, RelationsError } from '../src/services/relations.service.js';
import { hashToken } from '../src/utils/tokens.js';

describe('RelationsService and Business Rules (T5)', () => {
  let testFamilyId: string;

  beforeAll(async () => {
    await sequelize.authenticate();
    await runMigrations(sequelize);

    const fam = await Family.create({
      name: 'Famille Test',
      subtitle: 'Arbre de test',
      edit_token_hash: hashToken('test-token'),
    });
    testFamilyId = fam.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('crée la première personne sans relation obligatoire', async () => {
    const snap = await relationsService.createPersonWithRelation(testFamilyId, {
      firstName: 'Grand-père',
      lastName: 'Test',
      gender: 'M',
      isDeceased: false,
    });

    expect(snap.persons.length).toBe(1);
    expect(snap.persons[0].firstName).toBe('Grand-père');
  });

  it('crée un conjoint avec spouse_of', async () => {
    const root = (await relationsService.getSnapshot(testFamilyId)).persons[0];
    const snap = await relationsService.createPersonWithRelation(testFamilyId, {
      firstName: 'Grand-mère',
      lastName: 'Test',
      gender: 'F',
      isDeceased: false,
      relation: {
        type: 'spouse_of',
        targetId: root.id,
      },
    });

    expect(snap.persons.length).toBe(2);
    expect(snap.unions.length).toBe(1);
    expect(snap.unions[0].partnerIds).toContain(root.id);
  });

  it('ajoute un enfant avec child_of', async () => {
    const snapBefore = await relationsService.getSnapshot(testFamilyId);
    const parent = snapBefore.persons[0];

    const snap = await relationsService.createPersonWithRelation(testFamilyId, {
      firstName: 'Enfant 1',
      lastName: 'Test',
      gender: 'M',
      isDeceased: false,
      relation: {
        type: 'child_of',
        targetId: parent.id,
      },
    });

    expect(snap.persons.length).toBe(3);
    const child = snap.persons.find((p) => p.firstName === 'Enfant 1');
    expect(child).toBeDefined();
    expect(child?.parentUnionId).toBe(snap.unions[0].id);
  });

  it('ajoute un frère/sœur avec sibling_of', async () => {
    const snapBefore = await relationsService.getSnapshot(testFamilyId);
    const child1 = snapBefore.persons.find((p) => p.firstName === 'Enfant 1')!;

    const snap = await relationsService.createPersonWithRelation(testFamilyId, {
      firstName: 'Enfant 2',
      lastName: 'Test',
      gender: 'F',
      isDeceased: false,
      relation: {
        type: 'sibling_of',
        targetId: child1.id,
      },
    });

    const child2 = snap.persons.find((p) => p.firstName === 'Enfant 2');
    expect(child2?.parentUnionId).toBe(child1.parentUnionId);
  });

  it('bloque la création d’un 3ème parent avec PARENT_SLOTS_FULL', async () => {
    const snapBefore = await relationsService.getSnapshot(testFamilyId);
    const child1 = snapBefore.persons.find((p) => p.firstName === 'Enfant 1')!;

    await expect(
      relationsService.createPersonWithRelation(testFamilyId, {
        firstName: 'Parent 3 en trop',
        lastName: 'Test',
        gender: 'M',
        isDeceased: false,
        relation: {
          type: 'parent_of',
          targetId: child1.id,
        },
      })
    ).rejects.toThrowError(RelationsError);
  });

  it('supprime une personne et conserve ses enfants dans l’arbre', async () => {
    const snapBefore = await relationsService.getSnapshot(testFamilyId);
    const pToDelete = snapBefore.persons.find((p) => p.firstName === 'Grand-père')!;

    const snapAfter = await relationsService.deletePerson(testFamilyId, pToDelete.id);
    expect(snapAfter.persons.find((p) => p.id === pToDelete.id)).toBeUndefined();
    // Les enfants existent toujours
    expect(snapAfter.persons.find((p) => p.firstName === 'Enfant 1')).toBeDefined();
    expect(snapAfter.persons.find((p) => p.firstName === 'Enfant 2')).toBeDefined();
  });
});
