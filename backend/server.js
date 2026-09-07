const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Tiny .env loader so secrets in backend/.env become process.env entries.
// Runs before anything else so modules that read process.env at import
// time (like lib/aiSupport.js) see the values. We don't add dotenv as a
// dep because this project is meant to be beginner-friendly and the
// loader is small enough to keep inline.
const loadEnv = () => {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Strip optional surrounding quotes.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Don't clobber values already supplied by the shell — those win.
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (e) {
    console.error('Could not load .env:', e.message);
  }
};
loadEnv();

// Require auth AFTER loadEnv( ) so the Google/GitHub strategies read the
// env vars from backend/.env at import time. auth.js registers each
// strategy only if both client ID and secret are present, so requiring it
// before the env vars exist would silently skip OAuth.
const { passport } = require('./auth');

const app = express();
// Trust Railway proxy so we know we're behind HTTPS
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;

// CORS - allow the Vite dev server (port 5173) to send cookies.
// In production, swap this for your real frontend origin.
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Session middleware (used by Passport for OAuth). In-memory store is
// fine for a beginner project; restart clears sessions which is OK in
// development. In production you'd swap this for a persistent store.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // 7 days, matching the admin session TTL.
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // SameSite=lax so the cookie is sent on top-level navigations
      // (the OAuth callback redirects are top-level GETs) but not on
      // cross-site POSTs. Required for the OAuth flow to complete.
      sameSite: 'lax',
      // httpOnly so the cookie can't be read from JS. Secure should be
      // true in production (HTTPS only); we leave it off so it works
      // on http://localhost during development.
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Passport initialization. The strategies themselves are registered in
// auth.js (which is imported above so we can grab `passport` from it).
app.use(passport.initialize());
app.use(passport.session());

// Routes
const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const supportRoutes = require('./routes/support');

app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/support', supportRoutes);
app.use('/auth', oauthRoutes);

// Basic health check (used by the platform to confirm the app is up).
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve the built frontend (single-service production deploys).
// The Vite build outputs to frontend/dist; when that folder exists we
// serve it here so ONE Express server handles both the API and the site.
// Same origin means OAuth cookies and the relative /api fetches all just
// work - no CORS juggling. In development the Vite dev server on 5173
// proxies /api + /auth to this server instead, so dist is usually absent
// and we fall back to the plain JSON root below.
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback: any non-API, non-auth GET returns index.html so the
  // React Router routes (/menu, /admin, ...) work on direct refresh.
  app.get(/^\/(?!api\/|auth\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Development fallback - a plain root so you can tell the API is alive.
  app.get('/', (req, res) => {
    res.json({ message: 'Habibizz Kitchens API is running' });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});