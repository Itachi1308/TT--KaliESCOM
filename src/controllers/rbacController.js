const rbacModel = require('../models/rbacModel');

async function dashboard(req, res) {
  const matrix = await rbacModel.getRolePermissionMatrix();

  res.render('rbac', {
    pageTitle: 'Actores, roles y permisos',
    matrix
  });
}

module.exports = {
  dashboard
};

async function apiGetMatrix(req, res) {
  const matrix = await rbacModel.getRolePermissionMatrix();
  res.json({ ok: true, data: matrix });
}

async function apiCreatePermission(req, res) {
  try {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ ok: false, message: 'code and name required' });
    const perm = await rbacModel.createPermission(code, name);
    res.status(201).json({ ok: true, data: perm });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

async function apiCreateRole(req, res) {
  try {
    const { code, name, unitId } = req.body;
    if (!code || !name) return res.status(400).json({ ok: false, message: 'code and name required' });
    const role = await rbacModel.createRole(code, name, unitId || null);
    res.status(201).json({ ok: true, data: role });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

async function apiAddPermissionToRole(req, res) {
  try {
    const { roleCode, permissionCode } = req.body;
    await rbacModel.addPermissionToRole(roleCode, permissionCode);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
}

async function apiAssignRoleToActor(req, res) {
  try {
    const { actorId, roleCode } = req.body;
    await rbacModel.assignRoleToActor(actorId, roleCode);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
}

module.exports.apiGetMatrix = apiGetMatrix;
module.exports.apiCreatePermission = apiCreatePermission;
module.exports.apiCreateRole = apiCreateRole;
module.exports.apiAddPermissionToRole = apiAddPermissionToRole;
module.exports.apiAssignRoleToActor = apiAssignRoleToActor;

async function manageView(req, res) {
  const matrix = await rbacModel.getRolePermissionMatrix();
  const actors = await rbacModel.getActors();
  res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [], success: null });
}

async function handleCreatePermission(req, res) {
  try {
    const { code, name } = req.body;
    await rbacModel.createPermission(code, name);
    res.redirect('/rbac/manage');
  } catch (err) {
    const matrix = await rbacModel.getRolePermissionMatrix();
    const actors = await rbacModel.getActors();
    res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [err.message], success: null });
  }
}

async function handleCreateRole(req, res) {
  try {
    const { code, name, unitId } = req.body;
    await rbacModel.createRole(code, name, unitId || null);
    res.redirect('/rbac/manage');
  } catch (err) {
    const matrix = await rbacModel.getRolePermissionMatrix();
    const actors = await rbacModel.getActors();
    res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [err.message], success: null });
  }
}

async function handleAssignPermission(req, res) {
  try {
    const { roleCode, permissionCode } = req.body;
    await rbacModel.addPermissionToRole(roleCode, permissionCode);
    res.redirect('/rbac/manage');
  } catch (err) {
    const matrix = await rbacModel.getRolePermissionMatrix();
    const actors = await rbacModel.getActors();
    res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [err.message], success: null });
  }
}

async function handleAssignRoleToActor(req, res) {
  try {
    const { actorId, roleCode } = req.body;
    await rbacModel.assignRoleToActor(Number(actorId), roleCode);
    res.redirect('/rbac/manage');
  } catch (err) {
    const matrix = await rbacModel.getRolePermissionMatrix();
    const actors = await rbacModel.getActors();
    res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [err.message], success: null });
  }
}

async function handleRemovePermissionFromRole(req, res) {
  try {
    const { roleCode, permissionCode } = req.body;
    await rbacModel.removePermissionFromRole(roleCode, permissionCode);
    res.redirect('/rbac/manage');
  } catch (err) {
    const matrix = await rbacModel.getRolePermissionMatrix();
    const actors = await rbacModel.getActors();
    res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [err.message], success: null });
  }
}

async function handleRemoveRoleFromActor(req, res) {
  try {
    const { actorId, roleCode } = req.body;
    await rbacModel.removeRoleFromActor(Number(actorId), roleCode);
    res.redirect('/rbac/manage');
  } catch (err) {
    const matrix = await rbacModel.getRolePermissionMatrix();
    const actors = await rbacModel.getActors();
    res.render('rbac_manage', { pageTitle: 'Administrar RBAC', matrix, actors, errors: [err.message], success: null });
  }
}

module.exports.manageView = manageView;
module.exports.handleCreatePermission = handleCreatePermission;
module.exports.handleCreateRole = handleCreateRole;
module.exports.handleAssignPermission = handleAssignPermission;
module.exports.handleAssignRoleToActor = handleAssignRoleToActor;
module.exports.handleRemovePermissionFromRole = handleRemovePermissionFromRole;
module.exports.handleRemoveRoleFromActor = handleRemoveRoleFromActor;
