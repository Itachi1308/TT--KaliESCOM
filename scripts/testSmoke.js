const http = require('http');

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: HOST,
      port: PORT,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

(async () => {
  try {
    console.log('Probando /login GET...');
    const loginPage = await request('/login');
    if (loginPage.status !== 200) throw new Error('/login no devolvió 200');

    console.log('Probando POST /login con credenciales de prueba...');
    const post = await request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=direccion&password=Escom2026!'
    });

    if (![302, 303].includes(post.status)) throw new Error('Login no devolvió redirección esperada');

    const setCookie = post.headers['set-cookie'];
    if (!setCookie) throw new Error('No se recibió cookie de sesión');

    console.log('Obteniendo /api/context con cookie de sesión...');
    const cookie = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : setCookie.split(';')[0];
    const ctx = await request('/api/context', { headers: { Cookie: cookie } });
    if (ctx.status !== 200) throw new Error('/api/context no devolvió 200');

    const parsed = JSON.parse(ctx.body);
    if (!parsed.ok || !parsed.actor) throw new Error('Respuesta /api/context inválida');

    console.log('Prueba de humo completada con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('Prueba de humo fallida:', err.message);
    process.exit(2);
  }
})();
