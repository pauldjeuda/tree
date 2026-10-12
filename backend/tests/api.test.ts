import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrator.js';

describe('API Endpoints Test (T6, T7, T8)', () => {
  let familyId: string;
  let editToken: string;
  let shareId: string;
  let firstPersonId: string;

  beforeAll(async () => {
    await sequelize.authenticate();
    await runMigrations(sequelize);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('GET /api/v1/health renvoie 200 ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/families crée une famille et retourne le jeton d’édition', async () => {
    const res = await request(app)
      .post('/api/v1/families')
      .send({ name: 'Famille Dupont', subtitle: 'Arbre généalogique' });

    expect(res.status).toBe(201);
    expect(res.body.editToken).toBeDefined();
    expect(res.body.snapshot.family.name).toBe('Famille Dupont');

    familyId = res.body.snapshot.family.id;
    editToken = res.body.editToken;
  });

  it('refuse l’accès sans jeton d’édition', async () => {
    const res = await request(app).get(`/api/v1/families/${familyId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('autorise l’accès avec jeton d’édition valide', async () => {
    const res = await request(app)
      .get(`/api/v1/families/${familyId}`)
      .set('Authorization', `Bearer ${editToken}`);

    expect(res.status).toBe(200);
    expect(res.body.family.id).toBe(familyId);
  });

  it('POST /api/v1/families/:id/persons ajoute la première personne', async () => {
    const res = await request(app)
      .post(`/api/v1/families/${familyId}/persons`)
      .set('Authorization', `Bearer ${editToken}`)
      .send({
        firstName: 'Jean',
        lastName: 'Dupont',
        gender: 'M',
        roleLabel: 'Patriarche',
      });

    expect(res.status).toBe(201);
    expect(res.body.persons.length).toBe(1);
    firstPersonId = res.body.persons[0].id;
  });

  it('POST /api/v1/families/:id/share active le partage et génère shareId', async () => {
    const res = await request(app)
      .post(`/api/v1/families/${familyId}/share`)
      .set('Authorization', `Bearer ${editToken}`);

    expect(res.status).toBe(200);
    expect(res.body.shareId).toBeDefined();
    expect(res.body.active).toBe(true);
    shareId = res.body.shareId;
  });

  it('GET /api/v1/public/f/:shareId renvoie l’arbre en lecture seule', async () => {
    const res = await request(app).get(`/api/v1/public/f/${shareId}`);
    expect(res.status).toBe(200);
    expect(res.body.family.name).toBe('Famille Dupont');
    expect(res.body.persons.length).toBe(1);
  });

  it('PATCH /api/v1/families/:id/share désactive le lien -> 410 SHARE_INACTIVE', async () => {
    const patchRes = await request(app)
      .patch(`/api/v1/families/${familyId}/share`)
      .set('Authorization', `Bearer ${editToken}`)
      .send({ active: false });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.active).toBe(false);

    const publicRes = await request(app).get(`/api/v1/public/f/${shareId}`);
    expect(publicRes.status).toBe(410);
    expect(publicRes.body.error.code).toBe('SHARE_INACTIVE');
  });

  it('POST /api/v1/families/:id/share ne réactive pas un lien désactivé', async () => {
    const res = await request(app)
      .post(`/api/v1/families/${familyId}/share`)
      .set('Authorization', `Bearer ${editToken}`);

    expect(res.status).toBe(200);
    expect(res.body.shareId).toBe(shareId);
    expect(res.body.active).toBe(false);

    const publicRes = await request(app).get(`/api/v1/public/f/${shareId}`);
    expect(publicRes.status).toBe(410);
  });
});