const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');
const env = require('./config/env');
const database = require('./config/database');
const routes = require('./routes');
const cartService = require('./modules/orders/cartService');
const notificationService = require('./modules/notifications/notificationService');
const csrfMiddleware = require('./shared/middlewares/csrfMiddleware');
const errorLogService = require('./modules/error-logs/errorLogService');
const { isCustomerUser } = require('./shared/middlewares/authMiddleware');

const app = express();
const PgSession = pgSessionFactory(session);
const assetVersion = Date.now();

app.disable('x-powered-by');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'dashboard', 'src', 'views')
]);
app.set('view engine', 'ejs');

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/dashboard-assets', express.static(path.join(__dirname, 'dashboard', 'public')));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.static(path.join(__dirname, 'dashboard', 'public')));

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
  const user = req.session?.user ?? null;
  res.locals.appName = env.APP_NAME;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.assetVersion = assetVersion;
  res.locals.currentUser = user;
  res.locals.currentRole = user?.primaryRole?.display_name ?? user?.primaryRole?.name ?? user?.role ?? 'User';
  res.locals.cartSummary = cartService.getCartSummary(req.session);
  res.locals.dashboardPath = isCustomerUser(user) ? '/' : '/dashboard';
  res.locals.isCustomerUser = user ? isCustomerUser(user) : false;
  res.locals.dangerActions = [];
  next();
});

app.use(async (req, res, next) => {
  const userId = req.session?.user?.id ?? null;

  if (!userId) {
    res.locals.userNotifications = [];
    res.locals.userNotificationUnreadCount = 0;
    return next();
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listNotificationsForUser(userId, 5),
      notificationService.countUnreadNotificationsForUser(userId)
    ]);
    res.locals.userNotifications = notifications.map((notification) =>
      notificationService.decorateNotification(notification, req.session?.user ?? {})
    );
    res.locals.userNotificationUnreadCount = unreadCount;
  } catch (error) {
    console.error(error);
    res.locals.userNotifications = [];
    res.locals.userNotificationUnreadCount = 0;
  }

  return next();
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

  Promise.resolve(
    errorLogService.logError({
      error,
      req,
      severity: error.statusCode && error.statusCode < 500 ? 'warning' : 'critical',
      metadata: {
        status_code: error.statusCode ?? 500
      }
    })
  ).catch((loggingError) => {
    console.error(loggingError);
  });

  return res.status(500).render('pages/error', {
    pageTitle: 'Terjadi Kesalahan',
    message: 'Aplikasi mengalami kesalahan internal.'
  });
});

module.exports = app;
