import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { PASSWORD, WEB_ORIGIN, app, mobileUser, resetDatabase, uniqueEmail } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const register = (body: object) =>
  request(app).post('/api/auth/register').set('X-Client-Platform', 'mobile').send(body);

describe('registration', () => {
  it('normalises email and rejects case/whitespace duplicates', async () => {
    const res = await register({
      fullName: 'Ava',
      email: '  Ava@Example.COM ',
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ava@example.com');

    for (const variant of ['ava@example.com', 'AVA@EXAMPLE.COM', ' ava@example.com  ']) {
      const dup = await register({ fullName: 'Other', email: variant, password: PASSWORD });
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('EMAIL_TAKEN');
      expect(dup.body.error.fields.email).toBeDefined();
    }
    expect(await prisma.user.count()).toBe(1);
  });

  it('stores a bcrypt hash and never returns password material', async () => {
    const res = await register({ fullName: 'Ava', email: uniqueEmail(), password: PASSWORD });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(stored.passwordHash).not.toContain(PASSWORD);

    const text = JSON.stringify(res.body);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain(stored.passwordHash);
    expect(Object.keys(res.body.user).sort()).toEqual(['createdAt', 'email', 'fullName', 'id']);
  });

  it('validates fields and rejects unknown keys', async () => {
    const res = await register({
      fullName: '   ',
      email: 'not-an-email',
      password: 'short',
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'email',
      'fullName',
      'password',
      'role',
    ]);
  });

  it('rejects passwords longer than 72 UTF-8 bytes instead of truncating', async () => {
    const res = await register({ fullName: 'Ava', email: uniqueEmail(), password: 'é'.repeat(37) });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toMatch(/72 bytes/);
  });

  it('rejects a non-object or malformed JSON body', async () => {
    const malformed = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"fullName":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
  });
});

describe('login and transports', () => {
  it('uses a generic message for wrong password and unknown email', async () => {
    const user = await mobileUser();
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'nope-nope' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  it('web login sets an HttpOnly SameSite=Lax cookie and returns no token', async () => {
    const user = await mobileUser();
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    expect(res.body.token).toBeUndefined();
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/stride_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('mobile login returns a bearer token and sets no cookie', async () => {
    const user = await mobileUser();
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Client-Platform', 'mobile')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('cookie and bearer sessions resolve to the same user and data', async () => {
    const mobile = await mobileUser('Shared Account');
    await mobile.post('/api/projects', {
      name: 'Shared project',
      status: 'NOT_STARTED',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    const web = request.agent(app);
    await web
      .post('/api/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: mobile.email, password: PASSWORD })
      .expect(200);

    const [webMe, mobileMe] = await Promise.all([
      web.get('/api/auth/me'),
      mobile.get('/api/auth/me'),
    ]);
    expect(webMe.body.user).toEqual(mobileMe.body.user);

    const [webProjects, mobileProjects] = await Promise.all([
      web.get('/api/projects'),
      mobile.get('/api/projects'),
    ]);
    expect(webProjects.body).toEqual(mobileProjects.body);
    expect(webProjects.body.data).toHaveLength(1);
  });
});

describe('protected routes', () => {
  it('rejects missing, malformed and foreign-signed tokens', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);

    const malformed = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(malformed.status).toBe(401);

    const user = await mobileUser();
    const forged = jwt.sign(
      { sid: crypto.randomUUID() },
      'some-other-secret-that-is-also-long-enough',
      {
        subject: user.user.id,
        issuer: 'stride-api',
        audience: 'stride-clients',
        expiresIn: '1h',
      },
    );
    const res = await request(app).get('/api/projects').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired token and an expired database session', async () => {
    const user = await mobileUser();
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.user.id } });

    const expiredJwt = jwt.sign(
      { sid: session.id, exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET as string,
      { subject: user.user.id, issuer: 'stride-api', audience: 'stride-clients' },
    );
    const expired = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredJwt}`);
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('SESSION_EXPIRED');

    await prisma.authSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const dbExpired = await user.get('/api/auth/me');
    expect(dbExpired.status).toBe(401);
  });

  it('logout revokes only that session; the token then fails', async () => {
    const user = await mobileUser();
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .set('X-Client-Platform', 'mobile')
      .send({ email: user.email, password: PASSWORD });
    const otherToken = secondLogin.body.token as string;

    await user.post('/api/auth/logout').expect(204);
    const after = await user.get('/api/projects');
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('SESSION_EXPIRED');

    const other = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(other.status).toBe(200);
  });

  it('web logout clears the cookie and revokes the session', async () => {
    const user = await mobileUser();
    const web = request.agent(app);
    await web
      .post('/api/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: user.email, password: PASSWORD });
    await web.get('/api/auth/me').expect(200);

    const res = await web.post('/api/auth/logout').set('Origin', WEB_ORIGIN).expect(204);
    expect(String(res.headers['set-cookie'])).toMatch(/stride_session=;/);
    expect(
      await prisma.authSession.count({ where: { userId: user.user.id, revokedAt: { not: null } } }),
    ).toBe(1);
  });
});

describe('CSRF origin check for cookie sessions', () => {
  it('blocks cookie-authenticated writes without a trusted Origin', async () => {
    const user = await mobileUser();
    const web = request.agent(app);
    await web
      .post('/api/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: user.email, password: PASSWORD });
    const body = {
      name: 'X',
      status: 'NOT_STARTED',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
    };

    expect((await web.post('/api/projects').send(body)).status).toBe(403);
    expect(
      (await web.post('/api/projects').set('Origin', 'https://evil.example').send(body)).status,
    ).toBe(403);
    expect((await web.post('/api/projects').set('Origin', WEB_ORIGIN).send(body)).status).toBe(201);
  });
});

describe('rate limiting', () => {
  it('returns 429 after repeated failed logins from one IP', async () => {
    const limited = createApp({ authRateLimitMax: 3, serveWeb: false });
    const attempt = () =>
      request(limited)
        .post('/api/auth/login')
        .send({ email: 'nobody@stride.test', password: 'wrong-password' });
    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
