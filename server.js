const app = require('./src/app');
const { initializeDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Servidor activo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar la aplicacion:', error);
    process.exit(1);
  }
})();
