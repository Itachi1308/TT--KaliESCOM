const authModel = require('../models/authModel');

function loginView(req, res) {
  if (req.session && req.session.actorId) {
    return res.redirect('/');
  }

  return res.render('login', {
    pageTitle: 'Iniciar sesion',
    error: null
  });
}

async function login(req, res) {
  const { username, password } = req.body;
  const actor = await authModel.validateCredentials(username, password);

  if (!actor) {
    return res.status(401).render('login', {
      pageTitle: 'Iniciar sesion',
      error: 'Usuario o contrasena incorrectos.'
    });
  }

  req.session.actorId = actor.id;
  return res.redirect('/');
}

function logout(req, res) {
  if (!req.session) {
    return res.redirect('/login');
  }

  req.session.destroy(() => {
    res.clearCookie('escom.sid');
    res.redirect('/login');
  });
}

module.exports = {
  loginView,
  login,
  logout
};
