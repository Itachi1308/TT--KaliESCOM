const express = require('express');
const path = require('path');
const session = require('express-session');

const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { actorContext } = require('./middleware/actorContext');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    name: 'escom.sid',
    secret: process.env.SESSION_SECRET || 'escom-eventos-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use(actorContext);

app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Health check for container orchestrators
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use((req, res) => {
  res.status(404).render('notFound', {
    pageTitle: 'Pagina no encontrada'
  });
});

module.exports = app;
