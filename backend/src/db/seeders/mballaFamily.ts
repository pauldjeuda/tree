import crypto from 'crypto';
import sharp from 'sharp';
import { sequelize } from '../index.js';
import { Family, Person } from '../models/index.js';
import { generateEditToken, hashToken } from '../../utils/tokens.js';
import { relationsService } from '../../services/relations.service.js';
import { storageService } from '../../services/storage.service.js';
import { env } from '../../config/env.js';
import type { RelationType } from '../../shared/index.js';

// Générateur d'avatars illustrés (SVG) : aucune photo de personne réelle n'est utilisée.
function avatarSvg(name: string, gender: 'M' | 'F', ageGroup: 'elder' | 'adult' | 'young' | 'child') {
  const skinTones = ['#7A4B3A', '#8D5524', '#6F3A22', '#5A2E1C', '#965C38'];
  const skin = skinTones[(name.length + (gender === 'M' ? 1 : 2)) % skinTones.length];
  const bgColors = ['#F9EBE0', '#F5E6D3', '#EFE4D8', '#F8ECE1'];
  const bg = bgColors[name.length % bgColors.length];
  const hairColor = ageGroup === 'elder' ? '#D8D8D8' : '#1C1816';
  const shirtColor = gender === 'M' ? '#2F3E46' : '#8B5A2B';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="${bg}"/>
    <path d="M30 200 C30 150, 70 145, 100 145 C130 145, 170 150, 170 200 Z" fill="${shirtColor}" opacity="0.9"/>
    <rect x="86" y="125" width="28" height="28" rx="8" fill="${skin}"/>
    <ellipse cx="100" cy="95" rx="42" ry="48" fill="${skin}"/>
    <path d="M56 85 C56 50, 70 40, 100 40 C130 40, 144 50, 144 85 C140 65, 130 48, 100 48 C70 48, 60 65, 56 85 Z" fill="${hairColor}"/>
    <circle cx="86" cy="92" r="4.5" fill="#1C1917"/>
    <circle cx="114" cy="92" r="4.5" fill="#1C1917"/>
    <circle cx="87.5" cy="90.5" r="1.5" fill="#FFFFFF"/>
    <circle cx="115.5" cy="90.5" r="1.5" fill="#FFFFFF"/>
    <path d="M78 83 Q86 80 94 84" stroke="${ageGroup === 'elder' ? '#CCC' : '#111'}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M106 84 Q114 80 122 83" stroke="${ageGroup === 'elder' ? '#CCC' : '#111'}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M96 95 Q100 105 104 95" stroke="#4A2614" stroke-width="2" fill="none"/>
    <path d="M85 116 Q100 128 115 116" stroke="#2B1408" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M88 117 Q100 126 112 117" fill="#FFFFFF"/>
  </svg>`;
  return svg;
}

type Age = 'elder' | 'adult' | 'young' | 'child';

interface Member {
  key: string;
  firstName: string;
  gender: 'M' | 'F';
  roleLabel: string;
  age: Age;
  birthYear: number;
  relation?: { type: RelationType; of: string };
}

/** Les 17 membres de l'exemple « Famille Mballa » (même arbre que la maquette). */
const MEMBERS: Member[] = [
  { key: 'joseph', firstName: 'Joseph', gender: 'M', roleLabel: 'Père', age: 'elder', birthYear: 1948 },
  { key: 'marthe', firstName: 'Marthe', gender: 'F', roleLabel: 'Mère', age: 'elder', birthYear: 1952, relation: { type: 'spouse_of', of: 'joseph' } },
  { key: 'estelle', firstName: 'Estelle', gender: 'F', roleLabel: 'Fille', age: 'adult', birthYear: 1975, relation: { type: 'child_of', of: 'joseph' } },
  { key: 'carole', firstName: 'Carole', gender: 'F', roleLabel: 'Fille', age: 'adult', birthYear: 1978, relation: { type: 'child_of', of: 'joseph' } },
  { key: 'boris', firstName: 'Boris', gender: 'M', roleLabel: 'Fils', age: 'adult', birthYear: 1981, relation: { type: 'child_of', of: 'joseph' } },
  { key: 'romuald', firstName: 'Romuald', gender: 'M', roleLabel: 'Gendre', age: 'adult', birthYear: 1972, relation: { type: 'spouse_of', of: 'estelle' } },
  { key: 'patrick', firstName: 'Patrick', gender: 'M', roleLabel: 'Gendre', age: 'adult', birthYear: 1976, relation: { type: 'spouse_of', of: 'carole' } },
  { key: 'nadege', firstName: 'Nadège', gender: 'F', roleLabel: 'Belle-fille', age: 'adult', birthYear: 1983, relation: { type: 'spouse_of', of: 'boris' } },
  { key: 'yannick', firstName: 'Yannick', gender: 'M', roleLabel: 'Petit-fils', age: 'young', birthYear: 2000, relation: { type: 'child_of', of: 'estelle' } },
  { key: 'laetitia', firstName: 'Laetitia', gender: 'F', roleLabel: 'Petite-fille', age: 'young', birthYear: 2003, relation: { type: 'child_of', of: 'estelle' } },
  { key: 'brice', firstName: 'Brice', gender: 'M', roleLabel: 'Petit-fils', age: 'child', birthYear: 2009, relation: { type: 'child_of', of: 'estelle' } },
  { key: 'michael', firstName: 'Michaël', gender: 'M', roleLabel: 'Petit-fils', age: 'young', birthYear: 2002, relation: { type: 'child_of', of: 'carole' } },
  { key: 'sandrine', firstName: 'Sandrine', gender: 'F', roleLabel: 'Petite-fille', age: 'young', birthYear: 2005, relation: { type: 'child_of', of: 'carole' } },
  { key: 'joelle', firstName: 'Joëlle', gender: 'F', roleLabel: 'Petite-fille', age: 'child', birthYear: 2010, relation: { type: 'child_of', of: 'carole' } },
  { key: 'diane', firstName: 'Diane', gender: 'F', roleLabel: 'Petite-fille', age: 'young', birthYear: 2006, relation: { type: 'child_of', of: 'boris' } },
  { key: 'arnaud', firstName: 'Arnaud', gender: 'M', roleLabel: 'Petit-gendre', age: 'adult', birthYear: 2004, relation: { type: 'spouse_of', of: 'diane' } },
  { key: 'elise', firstName: 'Élise', gender: 'F', roleLabel: 'Arrière-petite-fille', age: 'child', birthYear: 2024, relation: { type: 'child_of', of: 'diane' } },
];

/** Crée la famille d'exemple en passant par les vraies règles de relations. */
export async function seedMballaFamily() {
  await sequelize.authenticate();

  const editToken = generateEditToken();
  const family = await Family.create({
    name: 'Famille Mballa',
    subtitle: 'Arbre généalogique',
    edit_token_hash: hashToken(editToken),
  });

  const ids = new Map<string, string>();
  for (const m of MEMBERS) {
    const knownIds = new Set(ids.values());
    const snapshot = await relationsService.createPersonWithRelation(family.id, {
      firstName: m.firstName,
      lastName: 'Mballa',
      gender: m.gender,
      birthDate: `${m.birthYear}-06-15`,
      deathDate: null,
      isDeceased: false,
      roleLabel: m.roleLabel,
      relation: m.relation ? { type: m.relation.type, targetId: ids.get(m.relation.of)! } : undefined,
    });
    // La personne créée est la seule dont l'identifiant n'était pas connu (indépendant de l'ordre SQL).
    const created = snapshot.persons.find((p) => !knownIds.has(p.id))!;
    ids.set(m.key, created.id);

    // Avatar illustré → WebP 512 × 512 enregistré comme une vraie photo (nom de fichier seul en base).
    const webp = await sharp(Buffer.from(avatarSvg(m.firstName, m.gender, m.age)))
      .resize(512, 512)
      .webp({ quality: 85 })
      .toBuffer();
    const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
    await storageService.saveFile(filename, webp);
    await Person.update({ photo_path: filename }, { where: { id: created.id } });
  }

  console.log(`[Seeder] Famille Mballa créée (${MEMBERS.length} membres).`);
  console.log(`[Seeder] Lien d'édition : ${env.PUBLIC_APP_URL}/e/${family.id}#${editToken}`);
  return { familyId: family.id, editToken };
}
