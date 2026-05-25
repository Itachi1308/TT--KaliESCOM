const { initializeDatabase } = require('../src/config/database');

(async () => {
  try {
    await initializeDatabase({ reset: true });
    console.log('Base de datos reinicializada con datos de prueba.');
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la BD:', error);
    process.exit(1);
  }
})();
