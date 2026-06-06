const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');
const env = require('./config/env');
const database = require('./config/database');
const routes = require('./routes');
const cartService = require('./modules/orders/cartService');
const csrfMiddleware = require('./shared/middlewares/csrfMiddleware');

const app = express();
const PgSession = pgSessionFactory(session);

app.disable('x-powered-by');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const sessionConfig = {
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    maxAge: env.SESSION_MAX_AGE_MINUTES * 60 * 1000
  }
};

if (env.SESSION_STORE === 'postgres') {
  sessionConfig.store = new PgSession({
    conObject: {
      connectionString: env.DATABASE_URL
    },
    createTableIfMissing: false,
    tableName: 'sessions'
  });
}

app.use(session(sessionConfig));

app.use((req, res, next) => {
  res.locals.appName = env.APP_NAME;
  res.locals.currentUser = req.session?.user ?? null;
  res.locals.cartSummary = cartService.getCartSummary(req.session);
  next();
});

app.use(csrfMiddleware);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      app: 'prosperoudia'
    }
  });
});

app.use('/', routes);

app.use((req, res) => {
  return res.status(404).render('pages/error', {
    pageTitle: 'Halaman Tidak Ditemukan',
    message: 'Route tidak ditemukan.'
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  return res.status(500).render('pages/error', {
    pageTitle: 'Terjadi Kesalahan',
    message: 'Aplikasi mengalami kesalahan internal.'
  });
});

module.exports = app;
