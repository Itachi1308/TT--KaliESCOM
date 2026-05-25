const crypto = require('crypto');
const { getDatabase } = require('../config/database');
const rbacModel = require('./rbacModel');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

async function validateCredentials(username, password) {
  const db = getDatabase();
  const actor = await db.get(
    `
      SELECT id, username, password_hash AS passwordHash, is_active AS isActive
      FROM actors
      WHERE username = ?
      LIMIT 1
    `,
    [String(username || '').trim().toLowerCase()]
  );

  if (!actor || actor.isActive !== 1) {
    return null;
  }

  const incomingHash = hashPassword(password || '');
  if (incomingHash !== actor.passwordHash) {
    return null;
  }

  return rbacModel.getActorById(actor.id);
}

module.exports = {
  validateCredentials,
  hashPassword
};
