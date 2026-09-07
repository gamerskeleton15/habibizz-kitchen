// Auth helpers for the admin area AND customer OAuth login.
// - Reads the admin password from ADMIN_PASSWORD (env var on Vercel) or
//   falls back to backend/data/config.json (local dev). Production
//   requires the env var so the secret isn't bundled in the deploy.
// - Admin sessions are stored in Upstash Redis (see lib/store.js), with
//   a 7-day rolling TTL — survives Vercel cold starts.
// - Configures Passport with Google and GitHub OAuth strategies for
//   customer login. The strategies are only registered when both the
//   client ID and secret are present, same as before.
//
// Vercel note: in serverless, each invocation can be on a different
// cold instance. There is no shared in-memory state between requests
// anymore, so everything durable (sessions, users) goes through Redis.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const store = require('./lib/store');

// Admin password lookup. On Vercel we expect ADMIN_PASSWORD as an env
// var; locally, we still read backend/data/config.json for convenience.
const getAdminPassword = () => {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const configPath = path.join(__dirname, 'data', 'config.json');
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data).adminPassword;
  } catch (e) {
    console.error('Could not read config.json:', e.message);
    return null;
  }
};

// Constant-time comparison to prevent timing attacks.
const checkPassword = (input) => {
  const expected = getAdminPassword();
  if (!expected) return false;
  const a = Buffer.from(input || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// ---- Admin sessions (Redis-backed) ----

const createSession = async () => {
  const token = crypto.randomBytes(32).toString('hex');
  await store.createSession(token);
  return token;
};

// Express middleware that requires a valid admin session token.
// Reads the token from the Authorization header (Bearer ...) or from
// a `x-admin-token` header (simpler for fetch() from the frontend).
const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  let token = null;
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  }
  if (!(await store.isValidToken(token))) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  req.adminToken = token;
  next();
};

const deleteSession = (token) => store.deleteSession(token);

// ===== Customer OAuth (Google + GitHub) =====

// Find or create a user from an OAuth profile. `provider` is 'google' or
// 'github'. `profile` is the normalized object Passport gives us.
const findOrCreateUser = async (provider, profile) => {
  const users = await store.readUsers();
  const providerId = `${provider}:${profile.id}`;
  let user = users.find((u) => u.providerId === providerId);

  if (!user) {
    const email =
      (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
    const avatar =
      (profile.photos && profile.photos[0] && profile.photos[0].value) || null;
    const name =
      profile.displayName || profile.username || (email ? email.split('@')[0] : 'Customer');

    user = {
      id: uuidv4(),
      providerId,
      provider,
      name,
      email,
      avatar,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await store.writeUsers(users);
  }
  return user;
};

// Where this backend lives. Used to build the OAuth callback URL.
// PUBLIC_URL is the Vercel domain (e.g. https://habibizz-api.vercel.app).
// For local dev, default to http://localhost:4000 — but on Vercel you
// MUST set PUBLIC_URL because there's no other reliable signal.
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:4000').replace(/\/$/, '');

// ---- Google ----
const googleId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
if (googleId && googleSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleId,
        clientSecret: googleSecret,
        callbackURL: `${PUBLIC_URL}/auth/google/callback`,
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser('google', profile);
          return done(null, user);
        } catch (e) {
          return done(e, null);
        }
      }
    )
  );
}

// ---- GitHub ----
const githubId = (process.env.GITHUB_CLIENT_ID || '').trim();
const githubSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
if (githubId && githubSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubId,
        clientSecret: githubSecret,
        callbackURL: `${PUBLIC_URL}/auth/github/callback`,
        scope: ['user:email'],
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser('github', profile);
          return done(null, user);
        } catch (e) {
          return done(e, null);
        }
      }
    )
  );
}

// Passport session: we still use the default express-session store,
// but express-session itself now talks to Redis (configured in api/index.js).
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const users = await store.readUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (e) {
    done(e, null);
  }
});

const isOAuthConfigured = (provider) => {
  if (provider === 'google') return !!(googleId && googleSecret);
  if (provider === 'github') return !!(githubId && githubSecret);
  return false;
};

const getUserById = async (id) => {
  if (!id) return null;
  const users = await store.readUsers();
  return users.find((u) => u.id === id) || null;
};

module.exports = {
  checkPassword,
  createSession,
  requireAuth,
  deleteSession,
  passport,
  isOAuthConfigured,
  getUserById,
};
