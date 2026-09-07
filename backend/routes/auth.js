// Admin authentication routes.
// - POST /api/admin/login   -> accepts { password }, returns a session token
// - POST /api/admin/logout  -> invalidates the given session token
//
// On Vercel, sessions are stored in Upstash Redis with a 7-day rolling
// TTL (see backend/auth.js + backend/lib/store.js).

const express = require('express');
const router = express.Router();
const { checkPassword, createSession, deleteSession } = require('../auth');

router.post('/login', async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required' });
  }
  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    const token = await createSession();
    res.json({ token, expiresInDays: 7, message: 'Logged in' });
  } catch (e) {
    console.error('createSession failed:', e);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.post('/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  let token = null;
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }
  if (token) deleteSession(token);
  res.json({ message: 'Logged out' });
});

module.exports = router;
