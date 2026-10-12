// Vérifie qu'un déploiement est correctement branché : site, API, base, photos, partage, CORS.
//
//   node scripts/smoke.mjs https://tree.exemple.com
//   node scripts/smoke.mjs https://tree.exemple.com --api https://api.exemple.com/api/v1
//
// Options :
//   --api <url>     URL de l'API si elle n'est pas sous <site>/api/v1 (site et API sur deux domaines)
//   --origin <url>  origine du site pour contrôler CORS (par défaut : l'adresse du site)
//
// Crée une famille de test « Smoke test » (aucune donnée sensible). Code de sortie 1 au moindre échec.
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const site = (args.find((a) => !a.startsWith('--') && a !== flag('--api') && a !== flag('--origin')) ?? '').replace(/\/+$/, '');
if (!site) {
  console.error('Usage : node scripts/smoke.mjs <adresse-du-site> [--api <url-api>] [--origin <url>]');
  process.exit(2);
}
const api = (flag('--api') ?? `${site}/api/v1`).replace(/\/+$/, '');
const origin = (flag('--origin') ?? site).replace(/\/+$/, '');
const separateDomains = new URL(api).origin !== new URL(site).origin;

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

let failed = 0;
const step = async (label, fn) => {
  try {
    const detail = await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? `  \x1b[2m${detail}\x1b[0m` : ''}`);
  } catch (err) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}\n      → ${err.message}`);
  }
};
const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};
const json = async (res) => res.json().catch(() => ({}));

console.log(`\nSite : ${site}\nAPI  : ${api}\n`);

let familyId, token, personId, shareId;
const auth = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

await step('Le site répond et contient l’application', async () => {
  const res = await fetch(`${site}/`);
  const html = await res.text();
  expect(res.ok, `HTTP ${res.status}`);
  expect(html.includes('id="root"'), 'la page ne ressemble pas au site Tree (div#root absent)');
});

await step('Les routes React répondent (réécriture vers index.html)', async () => {
  for (const path of ['/nouvelle-famille', '/f/aaaaaaaaaaaa']) {
    const res = await fetch(`${site}${path}`);
    const html = await res.text();
    expect(res.ok && html.includes('id="root"'), `${path} → HTTP ${res.status} : configurez la réécriture vers index.html`);
  }
});

await step('Le site est construit avec la bonne adresse d’API (VITE_API_URL)', async () => {
  const html = await (await fetch(`${site}/`)).text();
  if (html.includes('/@vite/client')) return 'serveur de développement Vite : contrôle sans objet';
  const scripts = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  expect(scripts.length > 0, 'aucun fichier JavaScript trouvé dans la page');
  // Vite inscrit VITE_API_URL tel quel dans le JavaScript au moment du build.
  const expected = separateDomains ? api : '/api/v1';
  for (const path of scripts) {
    const js = await (await fetch(`${site}${path}`)).text();
    if (js.includes(`"${expected}"`) || js.includes(`'${expected}'`)) return expected;
  }
  throw new Error(
    separateDomains
      ? `le site ne contient pas ${expected} : reconstruisez-le avec VITE_API_URL=${expected} (npm run build)`
      : 'le site ne contient pas /api/v1 : il a été construit avec une autre VITE_API_URL',
  );
});

await step('L’API et sa base de données répondent', async () => {
  const res = await fetch(`${api}/health`);
  expect(res.ok, `HTTP ${res.status} : vérifiez le backend, la base et VITE_API_URL`);
  expect((await json(res)).status === 'ok', 'réponse inattendue');
});

if (separateDomains) {
  await step(`CORS : l’origine ${origin} est autorisée`, async () => {
    const res = await fetch(`${api}/health`, { headers: { Origin: origin } });
    expect(res.headers.get('access-control-allow-origin') === origin, 'CORS_ORIGIN du backend ne contient pas cette adresse');
  });
  await step('CORS : une origine inconnue est refusée', async () => {
    const res = await fetch(`${api}/health`, { headers: { Origin: 'https://intrus.example' } });
    expect(!res.headers.get('access-control-allow-origin'), 'le backend accepte n’importe quelle origine');
  });
}

await step('Création d’une famille', async () => {
  const res = await fetch(`${api}/families`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Smoke test' }) });
  const body = await json(res);
  expect(res.status === 201, `HTTP ${res.status} ${JSON.stringify(body.error ?? '')}`);
  familyId = body.snapshot.family.id;
  token = body.editToken;
  expect(token && token.length >= 40, 'jeton d’édition absent');
});

await step('L’édition exige le jeton (401 sans lui)', async () => {
  const res = await fetch(`${api}/families/${familyId}`);
  expect(res.status === 401, `HTTP ${res.status} au lieu de 401`);
});

await step('Ajout de deux personnes reliées', async () => {
  const first = await fetch(`${api}/families/${familyId}/persons`, { method: 'POST', headers: auth(), body: JSON.stringify({ firstName: 'Awa', lastName: 'Test', gender: 'F' }) });
  const a = await json(first);
  expect(first.status === 201, `HTTP ${first.status} ${JSON.stringify(a.error ?? '')}`);
  personId = a.persons[0].id;
  const second = await fetch(`${api}/families/${familyId}/persons`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ firstName: 'Paul', lastName: 'Test', gender: 'M', relation: { type: 'spouse_of', targetId: personId } }),
  });
  const b = await json(second);
  expect(second.status === 201 && b.persons.length === 2 && b.unions.length === 1, 'la relation n’a pas été enregistrée');
});

await step('Envoi et affichage d’une photo', async () => {
  const form = new FormData();
  form.append('photo', new Blob([PNG_1PX], { type: 'image/png' }), 'photo.png');
  const res = await fetch(`${api}/families/${familyId}/persons/${personId}/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const person = await json(res);
  expect(res.ok && person.photoUrl, `HTTP ${res.status} ${JSON.stringify(person.error ?? '')}`);
  // Avec deux domaines, le navigateur résout une URL relative contre le SITE : elle doit donc être absolue.
  expect(!separateDomains || /^https?:\/\//.test(person.photoUrl), `l'URL de photo (${person.photoUrl}) est relative alors que le site et l'API sont sur deux domaines : définissez PUBLIC_API_URL dans le backend`);
  const url = new URL(person.photoUrl, site).toString();
  const img = await fetch(url, { headers: { Origin: origin } });
  expect(img.ok && (img.headers.get('content-type') ?? '').includes('image/webp'), `la photo n’est pas servie (${url} → HTTP ${img.status}) : volume des uploads, PUBLIC_API_URL ?`);
  return url;
});

await step('Création du lien de partage et lecture publique', async () => {
  const res = await fetch(`${api}/families/${familyId}/share`, { method: 'POST', headers: auth() });
  const share = await json(res);
  expect(res.ok && share.shareId && share.active, `HTTP ${res.status}`);
  shareId = share.shareId;
  expect(share.url.startsWith(site) || share.url.startsWith(origin), `le lien de partage (${share.url}) ne pointe pas vers le site : vérifiez PUBLIC_APP_URL`);
  const pub = await fetch(`${api}/public/f/${shareId}`);
  const body = await json(pub);
  expect(pub.ok && body.persons.length === 2, `HTTP ${pub.status}`);
  expect(body.family.shareId === undefined, 'la lecture publique expose le lien de partage');
  return share.url;
});

await step('La page partagée s’ouvre', async () => {
  const res = await fetch(`${site}/f/${shareId}`);
  expect(res.ok && (await res.text()).includes('id="root"'), `HTTP ${res.status}`);
});

await step('Désactiver le lien le coupe (410)', async () => {
  const off = await fetch(`${api}/families/${familyId}/share`, { method: 'PATCH', headers: auth(), body: JSON.stringify({ active: false }) });
  expect(off.ok, `HTTP ${off.status}`);
  const pub = await fetch(`${api}/public/f/${shareId}`);
  expect(pub.status === 410, `HTTP ${pub.status} au lieu de 410`);
});

console.log(failed ? `\n\x1b[31m${failed} vérification(s) en échec.\x1b[0m\n` : '\n\x1b[32mTout est correctement branché.\x1b[0m\n');
process.exit(failed ? 1 : 0);
