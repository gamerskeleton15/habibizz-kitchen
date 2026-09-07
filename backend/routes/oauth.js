// Routes for customer OAuth login (Google + GitHub).
// On Vercel the FRONTEND_URL env var must point at the Vercel-hosted
// frontend domain so the post-login redirect lands on the real SPA.

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isOAuthConfigured, getUserById } = require('../auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/google', (req, res, next) => {
  if (!isOAuthConfigured('google')) {
    return res.status(503).send(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    );
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?login=failed` }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/?login=success`);
  }
);

router.get('/github', (req, res, next) => {
  if (!isOAuthConfigured('github')) {
    return res.status(503).send(
      'GitHub sign-in is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.'
    );
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${FRONTEND_URL}/?login=failed` }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/?login=success`);
  }
);

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  });
});

router.get('/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  try {
    const fresh = await getUserById(req.user.id);
    if (!fresh) {
      return req.logout(() => {
        res.json({ user: null });
      });
    }
    const { providerId, ...safeUser } = fresh;
    res.json({ user: safeUser });
  } catch (e) {
    console.error('/auth/me failed:', e);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

module.exports = router;
