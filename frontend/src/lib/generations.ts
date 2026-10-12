import { Person, Union } from '../shared/index.js';

/**
 * Génération de chaque personne.
 *
 * - une personne sans union parente est de génération 0 ;
 * - un enfant a la génération de ses parents + 1 (le parent le plus bas fait foi) ;
 * - les conjoints partagent la même génération : un conjoint « venu de l'extérieur »
 *   (sans union parente) prend celle de son partenaire.
 *
 * Calcul par point fixe, borné pour rester sûr même sur des données incohérentes.
 */
export function computeGenerations(persons: Person[], unions: Union[]): Map<string, number> {
  const gen = new Map<string, number>(persons.map((p) => [p.id, 0]));
  const unionById = new Map(unions.map((u) => [u.id, u]));

  // Classes d'équivalence « même génération » : les partenaires d'une même union.
  const root = new Map<string, string>(persons.map((p) => [p.id, p.id]));
  const find = (id: string): string => {
    let r = id;
    while (root.get(r) !== r) r = root.get(r) ?? r;
    root.set(id, r);
    return r;
  };
  for (const u of unions) {
    const [first, ...others] = u.partnerIds.filter((id) => root.has(id));
    if (first === undefined) continue;
    for (const other of others) root.set(find(other), find(first));
  }
  const classes = new Map<string, string[]>();
  for (const p of persons) {
    const r = find(p.id);
    classes.set(r, [...(classes.get(r) ?? []), p.id]);
  }

  const maxPasses = persons.length + 2;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    // 1. Contrainte parents -> enfants
    const lowerBound = new Map<string, number>();
    for (const p of persons) {
      const union = p.parentUnionId ? unionById.get(p.parentUnionId) : undefined;
      if (!union || union.partnerIds.length === 0) continue;
      const parentGens = union.partnerIds.map((id) => gen.get(id)).filter((g): g is number => g !== undefined);
      if (parentGens.length) lowerBound.set(p.id, Math.max(...parentGens) + 1);
    }

    // 2. Une classe de conjoints prend la génération la plus basse de ses membres
    for (const members of classes.values()) {
      const target = Math.max(
        ...members.map((id) => Math.max(gen.get(id) ?? 0, lowerBound.get(id) ?? 0)),
      );
      for (const id of members) {
        if (gen.get(id) !== target) {
          gen.set(id, target);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return gen;
}
