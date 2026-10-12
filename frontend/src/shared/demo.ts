import { Person, TreeSnapshot, Union } from './types.js';

const DEMO_SHARE_ID = 'k9Xr2Lq8Zt';
const FAMILY_ID = 'demo-mballa';

function makePerson(
  id: string,
  firstName: string,
  gender: 'M' | 'F',
  parentUnionId: string | null,
  generation: number,
  roleLabel: string,
  portraitNumber: number | null,
  birthOrder: number,
): Person {
  const birthYear = 1940 + generation * 25 + birthOrder;
  return {
    id: `demo-${id}`,
    familyId: FAMILY_ID,
    firstName,
    lastName: 'Mballa',
    gender,
    birthDate: `${birthYear}-06-15`,
    deathDate: null,
    isDeceased: false,
    roleLabel,
    photoUrl: portraitNumber ? `/portraits/p${String(portraitNumber).padStart(2, '0')}.webp` : null,
    parentUnionId: parentUnionId ? `demo-u-${parentUnionId}` : null,
  };
}

/** Exemple volontairement compact : trois foyers, deux générations de descendants. */
export function generateMballaDemoSnapshot(): TreeSnapshot {
  const persons: Person[] = [
    makePerson('emmanuel', 'Emmanuel', 'M', null, 0, 'Père', 1, 0),
    makePerson('celestine', 'Célestine', 'F', null, 0, 'Mère', 2, 1),

    makePerson('marthe', 'Marthe', 'F', 'root', 1, 'Fille', 3, 0),
    makePerson('marc', 'Marc', 'M', null, 1, 'Époux', 4, 1),
    makePerson('joseph', 'Joseph', 'M', 'root', 1, 'Fils', 5, 2),
    makePerson('aline', 'Aline', 'F', null, 1, 'Épouse', 6, 3),
    makePerson('paul', 'Paul', 'M', 'root', 1, 'Fils', 7, 4),
    makePerson('nadia', 'Nadia', 'F', null, 1, 'Épouse', 8, 5),

    makePerson('mireille', 'Mireille', 'F', 'marthe', 2, 'Fille', 9, 0),
    makePerson('luc', 'Luc', 'M', 'marthe', 2, 'Fils', 10, 1),
    makePerson('elodie', 'Élodie', 'F', 'joseph', 2, 'Fille', 11, 2),
    makePerson('theodore', 'Théodore', 'M', 'joseph', 2, 'Fils', 12, 3),
    makePerson('jeanne', 'Jeanne', 'F', 'paul', 2, 'Fille', 13, 4),
    makePerson('david', 'David', 'M', 'paul', 2, 'Fils', null, 5),

    makePerson('safia', 'Safia', 'F', 'mireille', 3, 'Petite-fille', null, 0),
    makePerson('noe', 'Noé', 'M', 'theodore', 3, 'Petit-fils', null, 1),
    makePerson('ines', 'Inès', 'F', 'jeanne', 3, 'Petite-fille', null, 2),
  ];

  const unions: Union[] = [
    { id: 'demo-u-root', familyId: FAMILY_ID, partnerIds: ['demo-emmanuel', 'demo-celestine'] },
    { id: 'demo-u-marthe', familyId: FAMILY_ID, partnerIds: ['demo-marthe', 'demo-marc'] },
    { id: 'demo-u-joseph', familyId: FAMILY_ID, partnerIds: ['demo-joseph', 'demo-aline'] },
    { id: 'demo-u-paul', familyId: FAMILY_ID, partnerIds: ['demo-paul', 'demo-nadia'] },
    { id: 'demo-u-mireille', familyId: FAMILY_ID, partnerIds: ['demo-mireille'] },
    { id: 'demo-u-theodore', familyId: FAMILY_ID, partnerIds: ['demo-theodore'] },
    { id: 'demo-u-jeanne', familyId: FAMILY_ID, partnerIds: ['demo-jeanne'] },
  ];

  const family = {
    id: FAMILY_ID,
    name: 'Famille Mballa',
    subtitle: 'Arbre généalogique',
    shareId: DEMO_SHARE_ID,
    shareActive: true,
  };

  return { family, persons, unions };
}

export const DEMO_MBALLA_SHARE_ID = DEMO_SHARE_ID;