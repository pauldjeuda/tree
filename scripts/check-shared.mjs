// Le code partagé (types et schémas de validation) existe en deux copies : backend/src/shared et
// frontend/src/shared. Ce script vérifie qu'elles sont identiques (la copie de référence est celle du backend).
//   node scripts/check-shared.mjs          -> vérifie (code de sortie 1 si différent)
//   node scripts/check-shared.mjs --fix    -> recopie backend -> frontend
import { copyFileSync, readFileSync } from 'node:fs';

const FILES = ['types.ts', 'schemas.ts'];
const fix = process.argv.includes('--fix');
let bad = 0;

for (const file of FILES) {
  const ref = `backend/src/shared/${file}`;
  const copy = `frontend/src/shared/${file}`;
  if (readFileSync(ref, 'utf8') === readFileSync(copy, 'utf8')) {
    console.log(`  ok   ${file}`);
  } else if (fix) {
    copyFileSync(ref, copy);
    console.log(`  copié ${ref} -> ${copy}`);
  } else {
    console.error(`  DIFFÉRENT ${file} : lancez « npm run sync:shared »`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
