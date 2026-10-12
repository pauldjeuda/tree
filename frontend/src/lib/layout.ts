import { Person, TreeSnapshot, Union } from '../shared/index.js';
import { computeGenerations } from './generations.js';

/** Géométrie de l'affiche (px) — celle de la maquette « arbre généré ». */
export const GEOMETRY = {
  radius: 42, // cercle photo de 84 px
  footprint: 120, // largeur réservée à un membre (cercle + étiquette)
  couplePitch: 137, // distance entre les centres de deux conjoints
  unitGap: 23, // espace entre deux familles voisines
  groupGap: 40, // espace supplémentaire entre deux unions d'un même parent
  levelPitch: 196, // distance verticale entre deux générations
  firstRowY: 68, // centre de la première rangée
  labelBottom: 108, // bas de l'étiquette (nom + rôle) sous le centre du cercle
  busAboveChild: 69, // la barre horizontale passe 69 px au-dessus du centre des enfants
  leftInset: 232, // bord gauche de la zone d'arbre (après le bandeau)
  rightPadding: 64,
  bottomPadding: 36,
} as const;

/** Réduit les espacements sur les petits écrans en préservant davantage la taille des portraits et des libellés. */
export function getResponsiveGeometryScale(viewportWidth: number): number {
  const width = Math.max(320, Math.min(1200, viewportWidth));
  return 0.8 + ((width - 320) / 880) * 0.2;
}

export interface PositionedNode {
  person: Person;
  x: number; // centre x
  y: number; // centre y
  radius: number;
}

export interface ConnectorSegment {
  d: string;
}

export interface TreeLayout {
  width: number;
  height: number;
  nodes: PositionedNode[];
  connectors: ConnectorSegment[];
}

type Unit = {
  row: Person[]; // de gauche à droite
  groups: { union: Union; children: Unit[] }[];
  rowWidth: number;
  childrenWidth: number;
  width: number;
};

const byBirth = (a: { p: Person; i: number }, b: { p: Person; i: number }) => {
  const da = a.p.birthDate ?? '9999-12-31';
  const db = b.p.birthDate ?? '9999-12-31';
  return da === db ? a.i - b.i : da < db ? -1 : 1;
};

export function computeTreeLayout(
  snapshot: TreeSnapshot,
  minWidth = 1040,
  minHeight = 780,
  leftInset: number = GEOMETRY.leftInset,
  viewportWidth = 1200,
): TreeLayout {
  const { persons, unions } = snapshot;
  const factor = getResponsiveGeometryScale(viewportWidth);
  const G = {
    radius: Math.round(GEOMETRY.radius * factor),
    footprint: Math.round(GEOMETRY.footprint * factor),
    couplePitch: Math.round(GEOMETRY.couplePitch * factor),
    unitGap: Math.max(14, Math.round(GEOMETRY.unitGap * factor)),
    groupGap: Math.max(22, Math.round(GEOMETRY.groupGap * factor)),
    levelPitch: Math.round(GEOMETRY.levelPitch * factor),
    firstRowY: Math.round(GEOMETRY.firstRowY * factor),
    labelBottom: Math.round(GEOMETRY.labelBottom * factor),
    busAboveChild: Math.round(GEOMETRY.busAboveChild * factor),
    rightPadding: Math.round(GEOMETRY.rightPadding * factor),
    bottomPadding: Math.round(GEOMETRY.bottomPadding * factor),
  };

  if (persons.length === 0) {
    return { width: minWidth, height: minHeight, nodes: [], connectors: [] };
  }

  const order = new Map(persons.map((p, i) => [p.id, i]));
  const personById = new Map(persons.map((p) => [p.id, p]));
  const gens = computeGenerations(persons, unions);

  const unionsOf = new Map<string, Union[]>();
  for (const u of unions) {
    for (const id of u.partnerIds) unionsOf.set(id, [...(unionsOf.get(id) ?? []), u]);
  }
  const childrenOf = new Map<string, Person[]>();
  for (const u of unions) {
    const kids = persons
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.parentUnionId === u.id)
      .sort(byBirth)
      .map(({ p }) => p);
    childrenOf.set(u.id, kids);
  }

  const placed = new Set<string>();

  // ---- 1. Construction des « unités familiales » ------------------------------------------
  function buildUnit(primary: Person): Unit {
    placed.add(primary.id);
    const left: Person[] = [];
    const right: Person[] = [];

    const expand = (person: Person, side: Person[]) => {
      for (const u of unionsOf.get(person.id) ?? []) {
        for (const partnerId of u.partnerIds) {
          const partner = personById.get(partnerId);
          if (!partner || placed.has(partner.id)) continue;
          placed.add(partner.id);
          side.push(partner);
          expand(partner, side); // les conjoints de conjoints continuent vers l'extérieur
        }
      }
    };

    // Les conjoints du membre principal se répartissent à droite puis à gauche.
    let spouseIndex = 0;
    for (const u of unionsOf.get(primary.id) ?? []) {
      for (const partnerId of u.partnerIds) {
        const partner = personById.get(partnerId);
        if (!partner || placed.has(partner.id)) continue;
        placed.add(partner.id);
        const side = spouseIndex++ % 2 === 0 ? right : left;
        side.push(partner);
        expand(partner, side);
      }
    }

    const row = [...left.reverse(), primary, ...right];
    const rowIndex = new Map(row.map((p, i) => [p.id, i]));

    // Unions touchées par la rangée, de gauche à droite.
    const touched = new Map<string, Union>();
    for (const p of row) for (const u of unionsOf.get(p.id) ?? []) touched.set(u.id, u);
    const anchorX = (u: Union) => {
      const xs = u.partnerIds.map((id) => rowIndex.get(id)).filter((i): i is number => i !== undefined);
      return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
    };
    const clusterUnions = [...touched.values()].sort((a, b) => anchorX(a) - anchorX(b));

    const groups = clusterUnions.map((union) => {
      const children: Unit[] = [];
      for (const child of childrenOf.get(union.id) ?? []) {
        if (placed.has(child.id)) continue;
        children.push(buildUnit(child));
      }
      return { union, children };
    });

    return finalize(row, groups);
  }

  function finalize(row: Person[], groups: Unit['groups']): Unit {
    const rowWidth = (row.length - 1) * G.couplePitch + G.footprint;
    const nonEmpty = groups.filter((g) => g.children.length > 0);
    const groupWidths = nonEmpty.map(
      (g) => g.children.reduce((s, c) => s + c.width, 0) + (g.children.length - 1) * G.unitGap,
    );
    const childrenWidth =
      groupWidths.reduce((s, w) => s + w, 0) + Math.max(0, nonEmpty.length - 1) * (G.unitGap + G.groupGap);
    return { row, groups, rowWidth, childrenWidth, width: Math.max(rowWidth, childrenWidth) };
  }

  // ---- 2. Racines -----------------------------------------------------------------------------
  const topUnits: Unit[] = [];
  const ranked = [...persons].sort(
    (a, b) => (gens.get(a.id) ?? 0) - (gens.get(b.id) ?? 0) || (order.get(a.id)! - order.get(b.id)!),
  );

  // Unions sans partenaire connu : leurs enfants forment un groupe de frères et sœurs sans parents.
  for (const u of unions) {
    if (u.partnerIds.length > 0) continue;
    const kids = (childrenOf.get(u.id) ?? []).filter((c) => !placed.has(c.id));
    for (const kid of kids) topUnits.push(buildUnit(kid));
  }
  for (const p of ranked) {
    if (placed.has(p.id)) continue;
    const hasKnownParents = p.parentUnionId
      ? (unions.find((u) => u.id === p.parentUnionId)?.partnerIds.length ?? 0) > 0
      : false;
    // Une personne dont les parents existent est placée sous eux ; sinon elle ouvre une branche.
    if (hasKnownParents) continue;
    topUnits.push(buildUnit(p));
  }
  // Filet de sécurité : toute personne restante (données incohérentes) devient une racine.
  for (const p of ranked) if (!placed.has(p.id)) topUnits.push(buildUnit(p));

  // ---- 3. Positions -------------------------------------------------------------------------------
  const pos = new Map<string, { x: number; y: number }>();
  const rowY = (p: Person) => G.firstRowY + (gens.get(p.id) ?? 0) * G.levelPitch;

  function place(unit: Unit, left: number) {
    const rowLeft = left + (unit.width - unit.rowWidth) / 2;
    unit.row.forEach((p, i) => {
      pos.set(p.id, { x: rowLeft + G.footprint / 2 + i * G.couplePitch, y: rowY(p) });
    });
    let cursor = left + (unit.width - unit.childrenWidth) / 2;
    const nonEmpty = unit.groups.filter((g) => g.children.length > 0);
    nonEmpty.forEach((group, gi) => {
      group.children.forEach((child, ci) => {
        place(child, cursor);
        cursor += child.width + (ci < group.children.length - 1 ? G.unitGap : 0);
      });
      if (gi < nonEmpty.length - 1) cursor += G.unitGap + G.groupGap;
    });
  }

  // Centre la composition dans la zone libre lorsque le nombre de membres ne remplit pas le cadre.
  const treeWidth = topUnits.reduce((sum, unit) => sum + unit.width, 0) + Math.max(0, topUnits.length - 1) * G.unitGap * 2;
  const canvasWidth = Math.max(minWidth, leftInset + treeWidth + G.rightPadding);
  let cursor = leftInset + Math.max(0, (canvasWidth - leftInset - G.rightPadding - treeWidth) / 2);
  topUnits.forEach((unit, i) => {
    place(unit, cursor);
    cursor += unit.width + (i < topUnits.length - 1 ? G.unitGap * 2 : 0);
  });

  // ---- 4. Connecteurs ---------------------------------------------------------------------------------
  const connectors: ConnectorSegment[] = [];
  const r = G.radius;
  const fmt = (n: number) => Math.round(n * 100) / 100;

  for (const u of unions) {
    const partners = u.partnerIds.map((id) => pos.get(id)).filter((p): p is { x: number; y: number } => !!p);
    const kids = (childrenOf.get(u.id) ?? [])
      .map((c) => pos.get(c.id))
      .filter((p): p is { x: number; y: number } => !!p);

    let anchor: { x: number; y: number } | null = null;

    if (partners.length === 2) {
      const [a, b] = partners as [{ x: number; y: number }, { x: number; y: number }];
      const [l, rt] = a.x <= b.x ? [a, b] : [b, a];
      if (a.y === b.y) {
        connectors.push({ d: `M ${fmt(l.x + r)} ${a.y} L ${fmt(rt.x - r)} ${a.y}` });
        anchor = { x: (a.x + b.x) / 2, y: a.y };
      } else {
        // conjoints sur deux rangées (cas rare) : coude entre les deux cercles
        const [top, bottom] = a.y < b.y ? [a, b] : [b, a];
        const midY = (top.y + r + (bottom.y - r)) / 2;
        connectors.push({
          d: `M ${fmt(top.x)} ${top.y + r} L ${fmt(top.x)} ${fmt(midY)} L ${fmt(bottom.x)} ${fmt(midY)} L ${fmt(bottom.x)} ${bottom.y - r}`,
        });
        anchor = { x: (a.x + b.x) / 2, y: midY };
      }
    } else if (partners.length === 1) {
      const p = partners[0]!;
      anchor = { x: p.x, y: p.y + G.labelBottom + 4 };
    }

    if (!anchor || kids.length === 0) continue;

    const busY = Math.min(...kids.map((k) => k.y)) - G.busAboveChild;
    const minX = Math.min(anchor.x, ...kids.map((k) => k.x));
    const maxX = Math.max(anchor.x, ...kids.map((k) => k.x));
    const parts = [`M ${fmt(anchor.x)} ${fmt(anchor.y)} L ${fmt(anchor.x)} ${fmt(busY)}`];
    if (maxX > minX) parts.push(`M ${fmt(minX)} ${fmt(busY)} L ${fmt(maxX)} ${fmt(busY)}`);
    for (const k of kids) parts.push(`M ${fmt(k.x)} ${fmt(busY)} L ${fmt(k.x)} ${fmt(k.y - r)}`);
    connectors.push({ d: parts.join(' ') });
  }

  // ---- 5. Dimensions de l'affiche -------------------------------------------------------------
  const nodes: PositionedNode[] = persons.map((person) => {
    const p = pos.get(person.id) ?? { x: leftInset + G.footprint / 2, y: G.firstRowY };
    return { person, x: p.x, y: p.y, radius: r };
  });
  const maxY = Math.max(...nodes.map((n) => n.y));

  return {
    width: canvasWidth,
    height: Math.max(minHeight, maxY + G.labelBottom + G.bottomPadding),
    nodes,
    connectors,
  };
}
