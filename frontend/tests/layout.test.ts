import { describe, it, expect } from 'vitest';
import { computeTreeLayout, GEOMETRY } from '../src/lib/layout.js';
import { getFamilyBannerMetrics } from '../src/components/tree/PosterLeftBanner.js';
import { generateMballaDemoSnapshot, Person, TreeSnapshot, Union } from '../src/shared/index.js';

const person = (id: string, name: string, parentUnionId: string | null = null, birthDate: string | null = null): Person => ({
  id,
  firstName: name,
  lastName: 'Test',
  gender: 'M',
  birthDate,
  deathDate: null,
  isDeceased: false,
  roleLabel: null,
  photoUrl: null,
  parentUnionId,
});

const snap = (persons: Person[], unions: Union[]): TreeSnapshot => ({
  family: { id: 'f', name: 'Test', subtitle: 'Arbre' },
  persons,
  unions,
});

/** Le même arbre que la maquette : 17 personnes sur 4 générations. */
function mballa(): TreeSnapshot {
  const persons = [
    person('joseph', 'Joseph'), person('marthe', 'Marthe'),
    person('estelle', 'Estelle', 'u1'), person('carole', 'Carole', 'u1'), person('boris', 'Boris', 'u1'),
    person('romuald', 'Romuald'), person('patrick', 'Patrick'), person('nadege', 'Nadège'),
    person('yannick', 'Yannick', 'u2'), person('laetitia', 'Laetitia', 'u2'), person('brice', 'Brice', 'u2'),
    person('michael', 'Michaël', 'u3'), person('sandrine', 'Sandrine', 'u3'), person('joelle', 'Joëlle', 'u3'),
    person('diane', 'Diane', 'u4'), person('arnaud', 'Arnaud'), person('elise', 'Élise', 'u5'),
  ];
  const unions: Union[] = [
    { id: 'u1', partnerIds: ['joseph', 'marthe'] },
    { id: 'u2', partnerIds: ['estelle', 'romuald'] },
    { id: 'u3', partnerIds: ['carole', 'patrick'] },
    { id: 'u4', partnerIds: ['boris', 'nadege'] },
    { id: 'u5', partnerIds: ['diane', 'arnaud'] },
  ];
  return snap(persons, unions);
}

describe('computeTreeLayout', () => {
  it('calcule la disposition pour un arbre vide sans erreur', () => {
    const layout = computeTreeLayout(snap([], []));
    expect(layout.nodes).toHaveLength(0);
    expect(layout.connectors).toHaveLength(0);
  });

  it('place les conjoints côte à côte à la distance de la maquette et trace le trait de couple', () => {
    const layout = computeTreeLayout(snap([person('a', 'Paul'), person('b', 'Sophie')], [{ id: 'u', partnerIds: ['a', 'b'] }]));
    const [a, b] = layout.nodes;
    expect(a!.y).toBe(b!.y);
    expect(Math.abs(b!.x - a!.x)).toBe(GEOMETRY.couplePitch);
    expect(layout.connectors.length).toBeGreaterThan(0);
  });

  it('aligne chaque conjoint sur la rangée de son partenaire (exemple Mballa)', () => {
    const s = mballa();
    const layout = computeTreeLayout(s);
    const node = (id: string) => layout.nodes.find((n) => n.person.id === id)!;
    for (const u of s.unions) {
      const [a, b] = u.partnerIds.map(node);
      expect(a!.y, `conjoints de ${u.id}`).toBe(b!.y);
    }
    const rows = new Set(layout.nodes.map((n) => n.y));
    expect([...rows].sort((x, y) => x - y)).toEqual([0, 1, 2, 3].map((i) => GEOMETRY.firstRowY + i * GEOMETRY.levelPitch));
  });

  it('place les enfants sous leurs parents, groupés par famille et sans chevauchement', () => {
    const s = mballa();
    const layout = computeTreeLayout(s);
    const x = (id: string) => layout.nodes.find((n) => n.person.id === id)!.x;
    // les trois enfants d'Estelle sont centrés sous son couple
    const coupleMid = (x('estelle') + x('romuald')) / 2;
    const kids = ['yannick', 'laetitia', 'brice'].map(x);
    expect((Math.min(...kids) + Math.max(...kids)) / 2).toBeCloseTo(coupleMid, 0);
    // les familles ne s'entrelacent pas : tous les enfants d'Estelle sont à gauche de ceux de Carole
    expect(Math.max(...kids)).toBeLessThan(Math.min(...['michael', 'sandrine', 'joelle'].map(x)));
    // aucun chevauchement sur une même rangée
    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a !== b && a.y === b.y) expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(GEOMETRY.footprint);
      }
    }
  });

  it('classe les frères et sœurs par date de naissance', () => {
    const s = snap(
      [person('p', 'Parent'), person('c1', 'Cadet', 'u', '2010-01-01'), person('c2', 'Aîné', 'u', '2001-01-01')],
      [{ id: 'u', partnerIds: ['p'] }],
    );
    const layout = computeTreeLayout(s);
    const x = (id: string) => layout.nodes.find((n) => n.person.id === id)!.x;
    expect(x('c2')).toBeLessThan(x('c1'));
  });

  it('gère une personne avec deux unions (polygamie, remariage) en gardant chaque conjoint à côté', () => {
    const s = snap(
      [person('h', 'Chef'), person('w1', 'Epouse1'), person('w2', 'Epouse2'), person('k1', 'Enfant1', 'u1'), person('k2', 'Enfant2', 'u2')],
      [
        { id: 'u1', partnerIds: ['h', 'w1'] },
        { id: 'u2', partnerIds: ['h', 'w2'] },
      ],
    );
    const layout = computeTreeLayout(s);
    const n = (id: string) => layout.nodes.find((x) => x.person.id === id)!;
    expect(new Set(['h', 'w1', 'w2'].map((id) => n(id).y)).size).toBe(1);
    expect(Math.abs(n('h').x - n('w1').x)).toBe(GEOMETRY.couplePitch);
    expect(Math.abs(n('h').x - n('w2').x)).toBe(GEOMETRY.couplePitch);
    expect(layout.nodes).toHaveLength(5);
  });

  it('place les enfants d’une union sans parent connu sur une même rangée', () => {
    const s = snap([person('a', 'Frère', 'u'), person('b', 'Sœur', 'u')], [{ id: 'u', partnerIds: [] }]);
    const layout = computeTreeLayout(s);
    expect(layout.nodes[0]!.y).toBe(layout.nodes[1]!.y);
  });

  it('conserve des dimensions au moins égales à la maquette (1040 × 780)', () => {
    const layout = computeTreeLayout(mballa(), 1040, 780);
    expect(layout.width).toBeGreaterThanOrEqual(1040);
    expect(layout.height).toBeGreaterThanOrEqual(780);
  });

  it('place tout le monde sur des données incohérentes sans boucler', () => {
    // cycle : a est enfant de b, b est enfant de a
    const s = snap([person('a', 'A', 'u2'), person('b', 'B', 'u1')], [
      { id: 'u1', partnerIds: ['a'] },
      { id: 'u2', partnerIds: ['b'] },
    ]);
    expect(computeTreeLayout(s).nodes).toHaveLength(2);
  });

  it('étend la largeur pour un grand arbre et réduit un nom de famille très long', () => {
    const metrics = getFamilyBannerMetrics('Famille Mballa de la couronne des rois de l’ouest');
    expect(metrics.fontSize).toBeLessThan(58);

    const demo = generateMballaDemoSnapshot();
    const extraRoots = Array.from({ length: 16 }, (_, index) => person('large-root-' + index, 'Membre ' + index));
    const deepPersons: Person[] = [];
    const deepUnions: Union[] = [];
    let parentUnionId: string | null = 'demo-u-root';

    for (let generation = 0; generation < 6; generation++) {
      const id = 'large-descendant-' + generation;
      const unionId = 'large-union-' + generation;
      deepPersons.push(person(id, 'Descendant ' + generation, parentUnionId));
      deepUnions.push({ id: unionId, partnerIds: [id] });
      parentUnionId = unionId;
    }

    const largeTree = {
      ...demo,
      persons: [...demo.persons, ...extraRoots, ...deepPersons],
      unions: [...demo.unions, ...deepUnions],
    };
    expect(largeTree.persons.length).toBeGreaterThan(30);
    const layout = computeTreeLayout(largeTree, 1040, 780);
    expect(layout.nodes).toHaveLength(largeTree.persons.length);
    expect(layout.width).toBeGreaterThan(1500);
    expect(layout.height).toBeGreaterThan(1000);
    const xs = new Set<string>();
    for (const n of layout.nodes) {
      const key = `${n.y}:${Math.round(n.x)}`;
      expect(xs.has(key), `deux personnes au même endroit : ${key}`).toBe(false);
      xs.add(key);
    }
  });
});
