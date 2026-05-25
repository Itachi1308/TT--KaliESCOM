const { initializeDatabase } = require('../src/config/database');

module.exports = async () => {
  await initializeDatabase({ reset: true });
};
