const { getDatabase } = require('../config/database');

async function getActors() {
  const db = getDatabase();
  return db.all(
    `
      SELECT a.id, a.full_name AS fullName, a.actor_type AS actorType, u.name AS unitName
      FROM actors a
      LEFT JOIN organizational_units u ON u.id = a.unit_id
      WHERE a.is_active = 1
      ORDER BY a.full_name ASC
    `
  );
}

async function getActorById(actorId) {
  const db = getDatabase();
  return db.get(
    `
      SELECT a.id, a.full_name AS fullName, a.email, a.username, a.actor_type AS actorType, u.name AS unitName
      FROM actors a
      LEFT JOIN organizational_units u ON u.id = a.unit_id
      WHERE a.id = ? AND a.is_active = 1
    `,
    [actorId]
  );
}

async function getActorByUsername(username) {
  const db = getDatabase();
  return db.get(
    `
      SELECT a.id, a.full_name AS fullName, a.email, a.username, a.actor_type AS actorType, u.name AS unitName
      FROM actors a
      LEFT JOIN organizational_units u ON u.id = a.unit_id
      WHERE a.username = ? AND a.is_active = 1
    `,
    [String(username || '').trim().toLowerCase()]
  );
}

async function getActorRoles(actorId) {
  const db = getDatabase();
  return db.all(
    `
      SELECT r.id, r.code, r.name
      FROM actor_roles ar
      INNER JOIN roles r ON r.id = ar.role_id
      WHERE ar.actor_id = ?
      ORDER BY r.name ASC
    `,
    [actorId]
  );
}

async function getActorPermissions(actorId) {
  const db = getDatabase();
  return db.all(
    `
      SELECT DISTINCT p.code, p.name
      FROM actor_roles ar
      INNER JOIN role_permissions rp ON rp.role_id = ar.role_id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE ar.actor_id = ?
      ORDER BY p.code ASC
    `,
    [actorId]
  );
}

async function actorHasPermission(actorId, permissionCode) {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT COUNT(*) AS total
      FROM actor_roles ar
      INNER JOIN role_permissions rp ON rp.role_id = ar.role_id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE ar.actor_id = ? AND p.code = ?
    `,
    [actorId, permissionCode]
  );

  return row.total > 0;
}

async function getRolePermissionMatrix() {
  const db = getDatabase();
  const roles = await db.all('SELECT id, code, name FROM roles ORDER BY id ASC');
  const permissions = await db.all('SELECT id, code, name FROM permissions ORDER BY id ASC');
  const links = await db.all('SELECT role_id AS roleId, permission_id AS permissionId FROM role_permissions');

  const map = new Set(links.map((item) => `${item.roleId}:${item.permissionId}`));

  return {
    roles,
    permissions,
    matrix: roles.map((role) => ({
      role,
      permissionCodes: permissions
        .filter((permission) => map.has(`${role.id}:${permission.id}`))
        .map((permission) => permission.code)
    }))
  };
}

async function createPermission(code, name) {
  const db = getDatabase();
  await db.run('INSERT OR IGNORE INTO permissions (code, name) VALUES (?, ?)', [code, name]);
  return db.get('SELECT id, code, name FROM permissions WHERE code = ?', [code]);
}

async function createRole(code, name, unitId = null) {
  const db = getDatabase();
  await db.run('INSERT OR IGNORE INTO roles (code, name, unit_id) VALUES (?, ?, ?)', [code, name, unitId]);
  return db.get('SELECT id, code, name, unit_id AS unitId FROM roles WHERE code = ?', [code]);
}

async function addPermissionToRole(roleCode, permissionCode) {
  const db = getDatabase();
  const role = await db.get('SELECT id FROM roles WHERE code = ?', [roleCode]);
  const perm = await db.get('SELECT id FROM permissions WHERE code = ?', [permissionCode]);
  if (!role || !perm) throw new Error('Rol o permiso no encontrado');
  await db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, perm.id]);
  return true;
}

async function removePermissionFromRole(roleCode, permissionCode) {
  const db = getDatabase();
  const role = await db.get('SELECT id FROM roles WHERE code = ?', [roleCode]);
  const perm = await db.get('SELECT id FROM permissions WHERE code = ?', [permissionCode]);
  if (!role || !perm) throw new Error('Rol o permiso no encontrado');
  await db.run('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?', [role.id, perm.id]);
  return true;
}

async function assignRoleToActor(actorId, roleCode) {
  const db = getDatabase();
  const role = await db.get('SELECT id FROM roles WHERE code = ?', [roleCode]);
  if (!role) throw new Error('Rol no encontrado');
  await db.run('INSERT OR IGNORE INTO actor_roles (actor_id, role_id) VALUES (?, ?)', [actorId, role.id]);
  return true;
}

async function removeRoleFromActor(actorId, roleCode) {
  const db = getDatabase();
  const role = await db.get('SELECT id FROM roles WHERE code = ?', [roleCode]);
  if (!role) throw new Error('Rol no encontrado');
  await db.run('DELETE FROM actor_roles WHERE actor_id = ? AND role_id = ?', [actorId, role.id]);
  return true;
}

module.exports = {
  getActors,
  getActorById,
  getActorByUsername,
  getActorRoles,
  getActorPermissions,
  actorHasPermission,
  getRolePermissionMatrix
};

module.exports.createPermission = createPermission;
module.exports.createRole = createRole;
module.exports.addPermissionToRole = addPermissionToRole;
module.exports.removePermissionFromRole = removePermissionFromRole;
module.exports.assignRoleToActor = assignRoleToActor;
module.exports.removeRoleFromActor = removeRoleFromActor;
