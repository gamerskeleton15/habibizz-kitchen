// Admin authentication routes.
// - POST /api/admin/login   -> accepts { password }, returns a session token
// - POST /api/admin/logout  -> invalidates the given session token
//
// Session tokens are managed by the auth module (in-memory Map, 7-day TTL).
// In a real production app you'd store sessions in a real DB or use JWTs.

const express = require('express');
const router = express.Router();
const { checkPassword, createSession, deleteSession } = require('../auth');

// POST /api/admin/login
// Body: { password: string }
// On success: { token: string, expiresInDays: number }
// On wrong password: 401
router.post('/login', (req, res) => {
  const { password } = req.body || {};

  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = createSession();
  res.json({
    token,
    expiresInDays: 7,
    message: 'Logged in',
  });
});

// POST /api/admin/logout
// Body: { token: string }  (or read from header, same as the middleware does)
// Invalidates the session so the token can no longer be used.
router.post('/logout', (req, res) => {
  // Accept the token from the body OR from the same headers requireAuth reads
  const auth = req.headers.authorization || '';
  let token = null;
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }

  if (token) {
    deleteSession(token);
  }

  // Always succeed - logout is idempotent (no harm if token was already gone)
  res.json({ message: 'Logged out' });
});

module.exports = router;
