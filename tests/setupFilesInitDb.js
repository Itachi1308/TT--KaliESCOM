const { execSync } = require('child_process');

try {
  // Ejecuta el script de inicialización de DB de manera síncrona
  execSync('node ./scripts/initDb.js', { stdio: 'inherit' });
} catch (err) {
  console.error('Fallo al inicializar la BD en setupFiles:', err);
  throw err;
}
