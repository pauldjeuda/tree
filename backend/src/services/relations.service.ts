import { Transaction, Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { Family, Person, Union } from '../db/models/index.js';
import {
  CreatePersonDto,
  MAX_PERSONS,
  Person as PersonDto,
  RelationInput,
  TreeSnapshot,
  UpdatePersonDto,
} from '../shared/index.js';
import { storageService } from './storage.service.js';

export class RelationsError extends Error {
  public code: string;
  public details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'RelationsError';
    this.code = code;
    this.details = details;
  }
}

type SnapshotOptions = { publicView?: boolean };

const byCreation = [
  ['createdAt', 'ASC'],
  ['id', 'ASC'],
] as [string, string][];

const normalizeDeceased = (isDeceased: boolean | undefined, deathDate: string | null | undefined) => {
  if (deathDate) return { isDeceased: true, deathDate };
  if (isDeceased === false) return { isDeceased: false, deathDate: null };
  return { isDeceased: isDeceased ?? false, deathDate: deathDate ?? null };
};

export function toPersonDto(p: Person): PersonDto {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    birthDate: p.birth_date,
    deathDate: p.death_date,
    isDeceased: p.is_deceased,
    roleLabel: p.role_label,
    photoUrl: storageService.getPublicUrl(p.photo_path),
    parentUnionId: p.parent_union_id,
  };
}

const partnersOf = (u: Union): string[] => [u.partner1_id, u.partner2_id].filter(Boolean) as string[];
const hasSlot = (u: Union) => !u.partner1_id || !u.partner2_id;

export class RelationsService {
  public async getSnapshot(
    familyId: string,
    t?: Transaction,
    options: SnapshotOptions = {},
  ): Promise<TreeSnapshot> {
    const family = await Family.findByPk(familyId, { transaction: t });
    if (!family) throw new RelationsError('NOT_FOUND', 'Famille introuvable');

    // L'ordre de création est explicite : le résultat ne dépend pas du moteur SQL.
    const persons = await Person.findAll({ where: { family_id: familyId }, order: byCreation, transaction: t });
    const unions = await Union.findAll({ where: { family_id: familyId }, order: byCreation, transaction: t });

    return {
      family: {
        id: family.id,
        name: family.name,
        subtitle: family.subtitle,
        createdAt: family.createdAt.toISOString(),
        // Le lien de partage n'est communiqué qu'au propriétaire.
        ...(options.publicView ? {} : { shareId: family.share_id, shareActive: family.share_active }),
      },
      persons: persons.map(toPersonDto),
      unions: unions.map((u) => ({ id: u.id, partnerIds: partnersOf(u) })),
    };
  }

  /** Horodatage strictement croissant : garantit un ordre de création stable dans la famille. */
  private async nextTimestamp(model: typeof Person | typeof Union, familyId: string, t: Transaction) {
    const last = await (model as typeof Person).findOne({
      where: { family_id: familyId },
      order: [['createdAt', 'DESC']],
      transaction: t,
    });
    const now = new Date();
    return last && last.createdAt.getTime() >= now.getTime() ? new Date(last.createdAt.getTime() + 1) : now;
  }

  private async unionsOfPerson(familyId: string, personId: string, t: Transaction): Promise<Union[]> {
    return Union.findAll({
      where: { family_id: familyId, [Op.or]: [{ partner1_id: personId }, { partner2_id: personId }] },
      order: byCreation,
      transaction: t,
    });
  }

  private async createUnion(familyId: string, partner1: string | null, partner2: string | null, t: Transaction) {
    return Union.create(
      {
        family_id: familyId,
        partner1_id: partner1,
        partner2_id: partner2,
        createdAt: await this.nextTimestamp(Union, familyId, t),
      },
      { transaction: t },
    );
  }

  private async addPartner(union: Union, personId: string, t: Transaction) {
    if (!union.partner1_id) union.partner1_id = personId;
    else if (!union.partner2_id) union.partner2_id = personId;
    else throw new RelationsError('PARENT_SLOTS_FULL', 'Cette union a déjà deux parents');
    await union.save({ transaction: t });
  }

  public async createPersonWithRelation(familyId: string, dto: CreatePersonDto): Promise<TreeSnapshot> {
    return sequelize.transaction(async (t) => {
      const family = await Family.findByPk(familyId, { transaction: t });
      if (!family) throw new RelationsError('NOT_FOUND', 'Famille introuvable');

      const count = await Person.count({ where: { family_id: familyId }, transaction: t });
      if (count >= MAX_PERSONS) {
        throw new RelationsError('LIMIT_REACHED', `Une famille est limitée à ${MAX_PERSONS} personnes`);
      }
      if (count === 0 && dto.relation) {
        throw new RelationsError('VALIDATION_ERROR', 'La première personne ne peut pas avoir de relation');
      }
      if (count > 0 && !dto.relation) {
        throw new RelationsError('VALIDATION_ERROR', 'Choisissez la relation avec un membre de la famille');
      }

      const target = dto.relation
        ? await Person.findOne({ where: { id: dto.relation.targetId, family_id: familyId }, transaction: t })
        : null;
      if (dto.relation && !target) {
        throw new RelationsError('NOT_FOUND', 'La personne cible est introuvable');
      }

      const { isDeceased, deathDate } = normalizeDeceased(dto.isDeceased, dto.deathDate);
      const created = await Person.create(
        {
          family_id: familyId,
          first_name: dto.firstName,
          last_name: dto.lastName,
          gender: dto.gender,
          birth_date: dto.birthDate ?? null,
          death_date: deathDate,
          is_deceased: isDeceased,
          role_label: dto.roleLabel ?? null,
          photo_path: null, // la photo passe uniquement par l'endpoint dédié
          parent_union_id: null,
          createdAt: await this.nextTimestamp(Person, familyId, t),
        },
        { transaction: t },
      );

      if (dto.relation && target) {
        await this.applyRelation(familyId, created, target, dto.relation, t);
        await this.assertNoCycle(familyId, t);
      }

      return this.getSnapshot(familyId, t);
    });
  }

  private async applyRelation(
    familyId: string,
    created: Person,
    target: Person,
    relation: RelationInput,
    t: Transaction,
  ): Promise<void> {
    const unions = await this.unionsOfPerson(familyId, target.id, t);

    switch (relation.type) {
      case 'child_of': {
        let union: Union | undefined;

        if (relation.unionId) {
          union = unions.find((u) => u.id === relation.unionId);
          if (!union) throw new RelationsError('VALIDATION_ERROR', "Cette union n'appartient pas à la personne choisie");
        } else if (relation.otherParentId) {
          if (relation.otherParentId === target.id) {
            throw new RelationsError('VALIDATION_ERROR', 'Les deux parents doivent être distincts');
          }
          const other = await Person.findOne({
            where: { id: relation.otherParentId, family_id: familyId },
            transaction: t,
          });
          if (!other) throw new RelationsError('NOT_FOUND', 'Le second parent est introuvable');

          union = unions.find((u) => partnersOf(u).includes(other.id));
          if (!union) {
            // Une union « parent seul » est complétée plutôt que dupliquée.
            const solo = unions.find((u) => partnersOf(u).length === 1 && hasSlot(u));
            if (solo) {
              await this.addPartner(solo, other.id, t);
              union = solo;
            } else {
              union = await this.createUnion(familyId, target.id, other.id, t);
            }
          }
        } else if (unions.length === 0) {
          union = await this.createUnion(familyId, target.id, null, t);
        } else if (unions.length === 1) {
          union = unions[0];
        } else {
          const choices = await Promise.all(
            unions.map(async (u) => {
              const spouseId = partnersOf(u).find((id) => id !== target.id) ?? null;
              const spouse = spouseId ? await Person.findByPk(spouseId, { transaction: t }) : null;
              return {
                unionId: u.id,
                spouseId,
                spouseName: spouse ? `${spouse.first_name} ${spouse.last_name}` : 'Parent seul / inconnu',
              };
            }),
          );
          throw new RelationsError(
            'AMBIGUOUS_UNION',
            `${target.first_name} a plusieurs unions. Précisez le second parent.`,
            choices,
          );
        }

        created.parent_union_id = union!.id;
        await created.save({ transaction: t });
        break;
      }

      case 'parent_of': {
        if (!target.parent_union_id) {
          const union = await this.createUnion(familyId, created.id, null, t);
          target.parent_union_id = union.id;
          await target.save({ transaction: t });
        } else {
          const parentUnion = await Union.findByPk(target.parent_union_id, { transaction: t });
          if (!parentUnion) throw new RelationsError('NOT_FOUND', 'Union parente introuvable');
          await this.addPartner(parentUnion, created.id, t);
        }
        break;
      }

      case 'spouse_of': {
        // Si la personne est déjà « parent seul » (enfants enregistrés sans conjoint),
        // le nouveau conjoint complète cette union : les enfants existants lui sont rattachés.
        const solo = unions.find((u) => partnersOf(u).length === 1 && hasSlot(u));
        if (solo) await this.addPartner(solo, created.id, t);
        else await this.createUnion(familyId, target.id, created.id, t);
        break;
      }

      case 'sibling_of': {
        let unionId = target.parent_union_id;
        if (!unionId) {
          const unknownParents = await this.createUnion(familyId, null, null, t);
          unionId = unknownParents.id;
          target.parent_union_id = unionId;
          await target.save({ transaction: t });
        }
        created.parent_union_id = unionId;
        await created.save({ transaction: t });
        break;
      }
    }
  }

  public async updatePerson(
    familyId: string,
    personId: string,
    dto: UpdatePersonDto,
  ): Promise<TreeSnapshot> {
    return sequelize.transaction(async (t) => {
      const person = await Person.findOne({ where: { id: personId, family_id: familyId }, transaction: t });
      if (!person) throw new RelationsError('NOT_FOUND', 'Membre introuvable');

      if (dto.firstName !== undefined) person.first_name = dto.firstName;
      if (dto.lastName !== undefined) person.last_name = dto.lastName;
      if (dto.gender !== undefined) person.gender = dto.gender;
      if (dto.birthDate !== undefined) person.birth_date = dto.birthDate ?? null;
      if (dto.roleLabel !== undefined) person.role_label = dto.roleLabel ?? null;

      const state = normalizeDeceased(
        dto.isDeceased ?? person.is_deceased,
        dto.deathDate !== undefined ? dto.deathDate : person.death_date,
      );
      person.is_deceased = state.isDeceased;
      person.death_date = state.deathDate;

      if (person.birth_date && person.death_date && person.death_date < person.birth_date) {
        throw new RelationsError('VALIDATION_ERROR', 'La date de décès doit être postérieure à la naissance', [
          { path: 'deathDate', message: 'La date de décès doit être postérieure à la naissance' },
        ]);
      }

      await person.save({ transaction: t });
      return this.getSnapshot(familyId, t);
    });
  }

  /** Supprime la personne et ses liens ; ses enfants restent dans l'arbre. */
  public async deletePerson(familyId: string, personId: string): Promise<TreeSnapshot> {
    let photoToRemove: string | null = null;

    const snapshot = await sequelize.transaction(async (t) => {
      const person = await Person.findOne({ where: { id: personId, family_id: familyId }, transaction: t });
      if (!person) throw new RelationsError('NOT_FOUND', 'Membre introuvable');
      photoToRemove = person.photo_path;

      const partnerUnions = await Union.findAll({
        where: { family_id: familyId, [Op.or]: [{ partner1_id: personId }, { partner2_id: personId }] },
        transaction: t,
      });
      for (const u of partnerUnions) {
        if (u.partner1_id === personId) u.partner1_id = null;
        if (u.partner2_id === personId) u.partner2_id = null;
        await u.save({ transaction: t });
      }
      await person.destroy({ transaction: t });

      // Une union sans partenaire ni enfant n'a plus de raison d'exister.
      const unions = await Union.findAll({ where: { family_id: familyId }, transaction: t });
      for (const u of unions) {
        if (partnersOf(u).length > 0) continue;
        const children = await Person.count({ where: { parent_union_id: u.id }, transaction: t });
        if (children === 0) await u.destroy({ transaction: t });
      }

      return this.getSnapshot(familyId, t);
    });

    // Le fichier n'est supprimé qu'une fois la transaction validée.
    await storageService.deleteFile(photoToRemove);
    return snapshot;
  }

  /** Une personne ne peut pas être son propre ancêtre. */
  public async assertNoCycle(familyId: string, t?: Transaction): Promise<void> {
    const persons = await Person.findAll({ where: { family_id: familyId }, transaction: t });
    const unions = await Union.findAll({ where: { family_id: familyId }, transaction: t });
    const unionById = new Map(unions.map((u) => [u.id, u]));
    const parentsOf = (p: Person): string[] => {
      const u = p.parent_union_id ? unionById.get(p.parent_union_id) : undefined;
      return u ? partnersOf(u) : [];
    };
    const personById = new Map(persons.map((p) => [p.id, p]));

    const done = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (done.has(id)) return false;
      visiting.add(id);
      const person = personById.get(id);
      for (const parentId of person ? parentsOf(person) : []) {
        if (visit(parentId)) return true;
      }
      visiting.delete(id);
      done.add(id);
      return false;
    };

    for (const p of persons) {
      if (visit(p.id)) {
        throw new RelationsError(
          'CYCLE_DETECTED',
          'Cette relation créerait un cycle : une personne ne peut pas être son propre ancêtre',
        );
      }
    }
  }
}

export const relationsService = new RelationsService();
