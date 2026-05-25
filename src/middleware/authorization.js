function requireAuth(req, res, next) {
  if (!req.currentActor) {
    return res.redirect('/login');
  }

  return next();
}

function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.currentActor) {
      return res.redirect('/login');
    }

    const permissions = req.currentPermissions || [];
    const hasPermission = permissions.some((permission) => permission.code === permissionCode);

    if (!hasPermission) {
      return res.status(403).render('forbidden', {
        pageTitle: 'Acceso denegado',
        requiredPermission: permissionCode
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requirePermission
};
