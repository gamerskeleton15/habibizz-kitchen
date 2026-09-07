// Build the Express app WITHOUT calling app.listen() — this is the
// serverless-friendly form. api/index.js imports `app` and hands it to
// Vercel. We keep the previous server.js's middleware, route mounts,
// and order so the API behaves identically to the old long-lived server.

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { passport } = require('./auth');

const app = express();

// Vercel terminates TLS at the edge, so app.set('trust proxy', 1) is
// required for req.secure to be true (and for the session cookie's
// `secure: true` flag to take effect on the OAuth callback).
app.set('trust proxy', 1);

// Allow the Vercel-hosted frontend (and localhost during dev) to call
// us with credentials so the session cookie is sent.
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// In serverless we use the default in-memory session store, which is
// fine because the Vercel function instance is "warm enough" to
// handle a single OAuth redirect burst. The real durability is the
// Redis-backed admin session token (see auth.js + lib/store.js).
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/auth'));
app.use('/api/support', require('./routes/support'));
app.use('/auth', require('./routes/oauth'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
