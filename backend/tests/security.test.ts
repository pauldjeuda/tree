import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { app, createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrator.js';
import { makeLimiter } from '../src/middleware/rateLimit.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { storageService } from '../src/services/storage.service.js';
import { seedMballaFamily } from '../src/db/seeders/mballaFamily.js';

const person = (firstName: string, extra: Record<string, unknown> = {}) => ({
  firstName,
  lastName: 'Test',
  gender: 'F',
  ...extra,
});

describe('Sécurité et robustesse de l’API', () => {
  let familyId: string;
  let token: string;
  let rootId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await sequelize.authenticate();
    await runMigrations(sequelize);
    const res = await request(app).post('/api/v1/families').send({ name: 'Famille Sécurité' });
    familyId = res.body.snapshot.family.id;
    token = res.body.editToken;
    const first = await request(app).post(`/api/v1/families/${familyId}/persons`).set(auth()).send(person('Racine'));
    rootId = first.body.persons[0].id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('authentification', () => {
    it('renvoie le même 401 pour un mauvais jeton et pour une famille inconnue', async () => {
      const wrong = await request(app).get(`/api/v1/families/${familyId}`).set('Authorization', 'Bearer ' + 'x'.repeat(43));
      const unknown = await request(app)
        .get('/api/v1/families/3f1c2a7e-5b6d-4c8e-9a10-2b3c4d5e6f70')
        .set('Authorization', 'Bearer ' + 'x'.repeat(43));
      const garbage = await request(app).get('/api/v1/families/pas-un-uuid').set(auth());
      for (const res of [wrong, unknown, garbage]) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      }
      expect(wrong.body).toEqual(unknown.body);
    });

    it('refuse un jeton valide utilisé sur une autre famille', async () => {
      const other = await request(app).post('/api/v1/families').send({ name: 'Autre famille' });
      const res = await request(app).get(`/api/v1/families/${other.body.snapshot.family.id}`).set(auth());
      expect(res.status).toBe(401);
    });

    it('refuse un identifiant de personne qui n’est pas un UUID', async () => {
      const res = await request(app).patch(`/api/v1/families/${familyId}/persons/abc`).set(auth()).send({ firstName: 'X' });
      expect(res.status).toBe(422);
    });
  });

  describe('CORS et erreurs', () => {
    it('autorise seulement les origines configurées', async () => {
      const ok = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
      expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      const evil = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
      expect(evil.headers['access-control-allow-origin']).toBeUndefined();
      expect(ok.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('renvoie une erreur JSON pour un JSON invalide, une route inconnue et un corps trop gros', async () => {
      const bad = await request(app).post('/api/v1/families').set('Content-Type', 'application/json').send('{"name":');
      expect(bad.status).toBe(422);
      expect(bad.body.error.code).toBe('VALIDATION_ERROR');

      const missing = await request(app).get('/api/v1/nimporte-quoi');
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('NOT_FOUND');

      const big = await request(app).post('/api/v1/families').send({ name: 'x', pad: 'y'.repeat(200_000) });
      expect(big.status).toBe(413);
      expect(big.body.error).toBeDefined();
    });

    it('applique TRUST_PROXY : la limite se calcule par client réel et non par proxy', async () => {
      const limited = express();
      limited.set('trust proxy', 1);
      limited.use(makeLimiter(60_000, 2, 'Trop de requêtes'));
      limited.get('/ping', (_req, res) => void res.json({ ok: true }));
      limited.use(errorHandler);
      const a = '203.0.113.1';
      const b = '203.0.113.2';
      expect((await request(limited).get('/ping').set('X-Forwarded-For', a)).status).toBe(200);
      expect((await request(limited).get('/ping').set('X-Forwarded-For', a)).status).toBe(200);
      const blocked = await request(limited).get('/ping').set('X-Forwarded-For', a);
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
      expect((await request(limited).get('/ping').set('X-Forwarded-For', b)).status).toBe(200);
    });

    it('createApp accepte une liste blanche personnalisée', async () => {
      const custom = createApp({ corsOrigins: ['https://tree.example'] });
      const res = await request(custom).get('/api/v1/health').set('Origin', 'https://tree.example');
      expect(res.headers['access-control-allow-origin']).toBe('https://tree.example');
    });
  });

  describe('données personnes', () => {
    it('ignore une photoUrl envoyée par le client', async () => {
      const res = await request(app)
        .post(`/api/v1/families/${familyId}/persons`)
        .set(auth())
        .send(person('Pixel', { photoUrl: 'https://tracker.example/p.png', relation: { type: 'sibling_of', targetId: rootId } }));
      expect(res.status).toBe(201);
      const created = res.body.persons.find((p: { firstName: string }) => p.firstName === 'Pixel');
      expect(created.photoUrl).toBeNull();
    });

    it('refuse les dates inexistantes et la relation sur une première personne', async () => {
      const date = await request(app)
        .post(`/api/v1/families/${familyId}/persons`)
        .set(auth())
        .send(person('Date', { birthDate: '2024-13-45', relation: { type: 'sibling_of', targetId: rootId } }));
      expect(date.status).toBe(422);

      const fresh = await request(app).post('/api/v1/families').send({ name: 'Vide' });
      const res = await request(app)
        .post(`/api/v1/families/${fresh.body.snapshot.family.id}/persons`)
        .set({ Authorization: `Bearer ${fresh.body.editToken}` })
        .send(person('Premier', { relation: { type: 'child_of', targetId: rootId } }));
      expect(res.status).toBe(422);
    });
  });

  describe('relations', () => {
    it('conserve l’ordre de création, même quand tout est créé dans la même milliseconde', async () => {
      const fam = await request(app).post('/api/v1/families').send({ name: 'Ordre' });
      const id = fam.body.snapshot.family.id;
      const h = { Authorization: `Bearer ${fam.body.editToken}` };
      const root = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('P0'));
      const targetId = root.body.persons[0].id;
      for (let i = 1; i <= 8; i++) {
        await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person(`P${i}`, { relation: { type: 'sibling_of', targetId } }));
      }
      const snap = await request(app).get(`/api/v1/families/${id}`).set(h);
      expect(snap.body.persons.map((p: { firstName: string }) => p.firstName)).toEqual(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
    });

    it('complète l’union « parent seul » quand on ajoute un conjoint (pas de piège d’ambiguïté)', async () => {
      const fam = await request(app).post('/api/v1/families').send({ name: 'Union' });
      const id = fam.body.snapshot.family.id;
      const h = { Authorization: `Bearer ${fam.body.editToken}` };
      const root = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Parent', { gender: 'M' }));
      const parentId = root.body.persons[0].id;
      await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Enfant1', { relation: { type: 'child_of', targetId: parentId } }));
      const withSpouse = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Conjointe', { relation: { type: 'spouse_of', targetId: parentId } }));
      expect(withSpouse.body.unions).toHaveLength(1);
      expect(withSpouse.body.unions[0].partnerIds).toHaveLength(2);
      const second = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Enfant2', { relation: { type: 'child_of', targetId: parentId } }));
      expect(second.status).toBe(201);
      const kids = second.body.persons.filter((p: { parentUnionId: string | null }) => p.parentUnionId === second.body.unions[0].id);
      expect(kids).toHaveLength(2);
    });

    it('signale l’ambiguïté d’union avec la liste des choix', async () => {
      const fam = await request(app).post('/api/v1/families').send({ name: 'Polygamie' });
      const id = fam.body.snapshot.family.id;
      const h = { Authorization: `Bearer ${fam.body.editToken}` };
      const root = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Chef', { gender: 'M' }));
      const chefId = root.body.persons[0].id;
      const w1 = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Epouse1', { relation: { type: 'spouse_of', targetId: chefId } }));
      const w1Id = w1.body.persons[1].id;
      await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Epouse2', { relation: { type: 'spouse_of', targetId: chefId } }));
      const ambiguous = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Enfant', { relation: { type: 'child_of', targetId: chefId } }));
      expect(ambiguous.status).toBe(409);
      expect(ambiguous.body.error.code).toBe('AMBIGUOUS_UNION');
      expect(ambiguous.body.error.details).toHaveLength(2);
      const resolved = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Enfant', { relation: { type: 'child_of', targetId: chefId, otherParentId: w1Id } }));
      expect(resolved.status).toBe(201);
    });

    it('refuse un troisième parent', async () => {
      const fam = await request(app).post('/api/v1/families').send({ name: 'Parents' });
      const id = fam.body.snapshot.family.id;
      const h = { Authorization: `Bearer ${fam.body.editToken}` };
      const root = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Enfant'));
      const childId = root.body.persons[0].id;
      for (const n of ['Mere', 'Pere']) {
        const ok = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person(n, { relation: { type: 'parent_of', targetId: childId } }));
        expect(ok.status).toBe(201);
      }
      const third = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Troisieme', { relation: { type: 'parent_of', targetId: childId } }));
      expect(third.status).toBe(409);
      expect(third.body.error.code).toBe('PARENT_SLOTS_FULL');
    });

    it('supprime un membre sans supprimer ses enfants', async () => {
      const fam = await request(app).post('/api/v1/families').send({ name: 'Suppression' });
      const id = fam.body.snapshot.family.id;
      const h = { Authorization: `Bearer ${fam.body.editToken}` };
      const root = await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Parent'));
      const parentId = root.body.persons[0].id;
      await request(app).post(`/api/v1/families/${id}/persons`).set(h).send(person('Enfant', { relation: { type: 'child_of', targetId: parentId } }));
      const del = await request(app).delete(`/api/v1/families/${id}/persons/${parentId}`).set(h);
      expect(del.status).toBe(200);
      expect(del.body.persons.map((p: { firstName: string }) => p.firstName)).toEqual(['Enfant']);
    });
  });

  describe('photos', () => {
    it('recompresse en WebP 512 × 512, expose une URL publique et supprime le fichier avec la personne', async () => {
      const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#a0522d' } }).png().toBuffer();
      const up = await request(app)
        .post(`/api/v1/families/${familyId}/persons/${rootId}/photo`)
        .set(auth())
        .attach('photo', png, { filename: 'photo.png', contentType: 'image/png' });
      expect(up.status).toBe(200);
      expect(up.body.photoUrl).toMatch(/^\/api\/v1\/uploads\/[a-f0-9]{32}\.webp$/);

      const name = up.body.photoUrl.split('/').pop() as string;
      const file = path.join(storageService.directory, name);
      expect(fs.existsSync(file)).toBe(true);
      const meta = await sharp(await fs.promises.readFile(file)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['webp', 512, 512]);

      const served = await request(app).get(up.body.photoUrl);
      expect(served.status).toBe(200);
      expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');

      const del = await request(app).delete(`/api/v1/families/${familyId}/persons/${rootId}/photo`).set(auth());
      expect(del.body.photoUrl).toBeNull();
      expect(fs.existsSync(file)).toBe(false);
    });

    it('refuse un faux fichier image et un fichier trop lourd', async () => {
      const fake = await request(app)
        .post(`/api/v1/families/${familyId}/persons/${rootId}/photo`)
        .set(auth())
        .attach('photo', Buffer.from('<?php echo 1; ?> pas une image du tout'), { filename: 'x.png', contentType: 'image/png' });
      expect(fake.status).toBe(415);
      expect(fake.body.error.code).toBe('FILE_INVALID');

      const huge = await request(app)
        .post(`/api/v1/families/${familyId}/persons/${rootId}/photo`)
        .set(auth())
        .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 10, 1), { filename: 'big.png', contentType: 'image/png' });
      expect(huge.status).toBe(413);
      expect(huge.body.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('partage public', () => {
    it('n’expose ni lien de partage ni identifiants internes, et coupe l’accès à la désactivation', async () => {
      const share = await request(app).post(`/api/v1/families/${familyId}/share`).set(auth());
      const { shareId } = share.body;
      const pub = await request(app).get(`/api/v1/public/f/${shareId}`);
      expect(pub.status).toBe(200);
      expect(pub.body.family.shareId).toBeUndefined();
      expect(pub.body.family.shareActive).toBeUndefined();
      expect(pub.headers['cache-control']).toContain('no-store');
      expect(JSON.stringify(pub.body)).not.toContain(token);

      await request(app).patch(`/api/v1/families/${familyId}/share`).set(auth()).send({ active: false });
      const off = await request(app).get(`/api/v1/public/f/${shareId}`);
      expect(off.status).toBe(410);
      expect(off.body.error.code).toBe('SHARE_INACTIVE');
    });

    it('ne crée pas de lien quand on désactive un partage inexistant ; l’ancien lien « démo » n’existe plus', async () => {
      const fam = await request(app).post('/api/v1/families').send({ name: 'Jamais partagée' });
      const off = await request(app)
        .patch(`/api/v1/families/${fam.body.snapshot.family.id}/share`)
        .set({ Authorization: `Bearer ${fam.body.editToken}` })
        .send({ active: false });
      expect(off.body).toEqual({ shareId: null, url: null, active: false });

      const demo = await request(app).get('/api/v1/public/f/demo-mballa-');
      expect(demo.status).toBe(404);
    });
  });

  describe('jeu d’essai', () => {
    it('crée l’exemple Famille Mballa (17 membres) sans URL ni data-URI en base', async () => {
      const { familyId: id, editToken } = await seedMballaFamily();
      const snap = await request(app).get(`/api/v1/families/${id}`).set({ Authorization: `Bearer ${editToken}` });
      expect(snap.body.persons).toHaveLength(17);
      expect(snap.body.unions).toHaveLength(5);
      for (const p of snap.body.persons) expect(p.photoUrl).toMatch(/^\/api\/v1\/uploads\/[a-f0-9]{32}\.webp$/);
    });
  });
});
