const { initializeDatabase } = require('../src/config/database');

module.exports = async () => {
  // Ensure a fresh test DB for each run
  await initializeDatabase({ reset: true });
};
