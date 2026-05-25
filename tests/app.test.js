const request = require('supertest');

describe('App basic routes', () => {
  let app;

  beforeAll(async () => {
    jest.resetModules();
    const { initializeDatabase } = require('../src/config/database');
    await initializeDatabase({ reset: true });
    // cargar app después de inicializar DB
    app = require('../src/app');
  });
  test('GET /login returns 200', async () => {
    const res = await request(app).get('/login');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Iniciar sesion');
  });

  test('POST /login and /api/context works', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/login')
      .send('username=direccion&password=Escom2026!')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect([302, 303]).toContain(res.statusCode);

    const ctx = await agent.get('/api/context');
    expect(ctx.statusCode).toBe(200);
    expect(ctx.body.ok).toBe(true);
    expect(ctx.body.actor).toBeDefined();
  });
});
