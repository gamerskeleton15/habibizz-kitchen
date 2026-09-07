// Auth helpers for the admin area AND customer OAuth login.
// - Reads the admin password from data/config.json
// - Maintains an in-memory map of session tokens (valid for 7 days)
// - Exposes middleware that checks a session token on protected routes
// - Configures Passport with Google and GitHub OAuth strategies for customers
//
// In a real production app you'd use JWT or sessions stored in a real DB.
// This is deliberately simple for a beginner project.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const configPath = path.join(__dirname, 'data', 'config.json');

// Persistent session store: backed by data/sessions.json so restarts don't
// log everyone out. In-memory cache for fast lookups, file for durability.
const sessionsFilePath = path.join(__dirname, 'data', 'sessions.json');

// Users data store: backend/data/users.json
// Each user: { id, name, email, avatar, provider, createdAt }
const usersFilePath = path.join(__dirname, 'data', 'users.json');

// Load existing sessions from disk on startup.
const loadSessions = () => {
  try {
    if (!fs.existsSync(sessionsFilePath)) return new Map();
    const data = fs.readFileSync(sessionsFilePath, 'utf8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch (e) {
    console.error('Could not load sessions.json, starting fresh:', e.message);
    return new Map();
  }
};

// Write the current in-memory sessions back to disk.
const saveSessions = () => {
  try {
    const obj = Object.fromEntries(sessions);
    fs.writeFileSync(sessionsFilePath, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Could not save sessions.json:', e.message);
  }
};

const sessions = loadSessions();

// How long a session is valid (7 days, in milliseconds)
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Read the admin password from config.json
const getAdminPassword = () => {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);
    return config.adminPassword;
  } catch (e) {
    console.error('Could not read config.json:', e.message);
    return null;
  }
};

// Check a password against the configured one. Returns true/false.
const checkPassword = (input) => {
  const expected = getAdminPassword();
  if (!expected) return false;
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(input || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// Generate a new random session token
const createSession = () => {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now() });
  saveSessions();
  return token;
};

// Check if a token is still valid (and prune if expired)
const isValidToken = (token) => {
  if (!token || !sessions.has(token)) return false;
  const { createdAt } = sessions.get(token);
  if (Date.now() - createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    saveSessions();
    return false;
  }
  return true;
};

// Delete a session (logout)
const deleteSession = (token) => {
  sessions.delete(token);
  saveSessions();
};

// Express middleware that requires a valid session token.
// Reads the token from the Authorization header (Bearer ...) or from
// a `x-admin-token` header (simpler for fetch() from the frontend).
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  let token = null;
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  }
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  // Attach the token to the request for downstream handlers
  req.adminToken = token;
  next();
};

// ===== Customer OAuth (Google + GitHub) =====

// Load users from disk. Returns [] if the file is missing.
const loadUsers = () => {
  try {
    if (!fs.existsSync(usersFilePath)) return [];
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Could not load users.json:', e.message);
    return [];
  }
};

// Save users to disk.
const saveUsers = (users) => {
  try {
    fs.mkdirSync(path.dirname(usersFilePath), { recursive: true });
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    return true;
  } catch (e) {
    console.error('Could not save users.json:', e.message);
    return false;
  }
};

// Find or create a user from an OAuth profile. `provider` is 'google' or
// 'github'. `profile` is the normalized object Passport gives us. Returns
// the full user record.
const findOrCreateUser = (provider, profile) => {
  const users = loadUsers();
  // The provider gives us a stable ID; we prefix it so a Google user and
  // a GitHub user with the same numeric ID never collide.
  const providerId = `${provider}:${profile.id}`;
  let user = users.find((u) => u.providerId === providerId);

  if (!user) {
    // Pull the best-available name/email/avatar out of the profile.
    // Google: profile.displayName, profile.emails[0].value, profile.photos[0].value
    // GitHub: profile.username / profile.displayName, profile.emails[0].value, profile.photos[0].value
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
    saveUsers(users);
  }
  return user;
};

// Configure Passport strategies. We only register a strategy if BOTH the
// client ID and secret are present, so the server still starts cleanly
// when the developer hasn't filled in .env yet. The routes file checks
// `isOAuthConfigured('google' | 'github')` before mounting the buttons.

// ---- Google ----
const googleId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
if (googleId && googleSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleId,
        clientSecret: googleSecret,
        callbackURL: '/auth/google/callback',
        proxy: true
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const user = findOrCreateUser('google', profile);
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
        callbackURL: '/auth/github/callback',
        scope: ['user:email'],
        proxy: true
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const user = findOrCreateUser('github', profile);
          return done(null, user);
        } catch (e) {
          return done(e, null);
        }
      }
    )
  );
}

// Tell Passport how to serialize/deserialize a user into the session cookie.
// We only need the user ID; the full record is reloaded on each request.
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return done(null, false);
  done(null, user);
});

// Public helpers used by routes/auth.js to gate the buttons.
const isOAuthConfigured = (provider) => {
  if (provider === 'google') return !!(googleId && googleSecret);
  if (provider === 'github') return !!(githubId && githubSecret);
  return false;
};

// Find a user by id (for /auth/me to rehydrate the session user on each
// request). Returns null if the user no longer exists.
const getUserById = (id) => {
  if (!id) return null;
  const users = loadUsers();
  return users.find((u) => u.id === id) || null;
};

module.exports = {
  checkPassword,
  createSession,
  isValidToken,
  deleteSession,
  requireAuth,
  // OAuth exports
  passport,
  isOAuthConfigured,
  getUserById,
};