const rbacModel = require('../models/rbacModel');

async function actorContext(req, res, next) {
  try {
    let currentActor = null;
    const sessionActorId = req.session ? Number(req.session.actorId) : NaN;
    if (Number.isInteger(sessionActorId) && sessionActorId > 0) {
      currentActor = await rbacModel.getActorById(sessionActorId);
    }

    let roles = [];
    let permissions = [];
    if (currentActor) {
      roles = await rbacModel.getActorRoles(currentActor.id);
      permissions = await rbacModel.getActorPermissions(currentActor.id);
    }

    req.currentActor = currentActor;
    req.currentRoles = roles;
    req.currentPermissions = permissions;

    res.locals.currentActor = currentActor;
    res.locals.currentRoles = roles;
    res.locals.currentPermissions = permissions;
    res.locals.isAuthenticated = Boolean(currentActor);

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  actorContext
};
