// Routes for customer OAuth login (Google + GitHub).
//
// Mounted at /auth (NOT /api/auth) so the URLs match what you register
// as Authorized Redirect URIs in the Google Cloud Console and GitHub
// Developer Settings.
//
// Endpoints:
//   GET  /auth/google              -> 302 to Google
//   GET  /auth/google/callback     -> 302 back to frontend (with session cookie)
//   GET  /auth/github              -> 302 to GitHub
//   GET  /auth/github/callback     -> 302 back to frontend (with session cookie)
//   POST /auth/logout              -> clears the session
//   GET  /auth/me                  -> { user: {...} } or { user: null }
//
// The frontend knows the session via the HTTP-only cookie. The frontend
// never sees the cookie value directly; it just calls /auth/me on page
// load to learn whether anyone is logged in.

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isOAuthConfigured, getUserById } = require('../auth');

// Where the frontend lives. After a successful login, we redirect the
// browser back here so the SPA can pick up the new session via /auth/me.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ---- Google ----

// GET /auth/google
// Kicks off the Google OAuth flow. If the developer hasn't set the
// Google client ID/secret, return a 503 so the frontend can hide the
// button gracefully instead of bouncing to a broken page.
router.get('/google', (req, res, next) => {
  if (!isOAuthConfigured('google')) {
    return res
      .status(503)
      .send(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.'
      );
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /auth/google/callback
// Google redirects the browser here after the user grants permission.
// We complete the handshake, attach the user to the session, and bounce
// back to the frontend.
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?login=failed` }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/?login=success`);
  }
);

// ---- GitHub ----

// GET /auth/github
router.get('/github', (req, res, next) => {
  if (!isOAuthConfigured('github')) {
    return res
      .status(503)
      .send(
        'GitHub sign-in is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env.'
      );
  }
  // scope: ['user:email'] asks GitHub for the user's primary email, which
  // is what we display in their profile. Without it we'd only get the
  // username and a possibly-null email.
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

// GET /auth/github/callback
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${FRONTEND_URL}/?login=failed` }),
  (req, res) => {
    res.redirect(`${FRONTEND_URL}/?login=success`);
  }
);

// POST /auth/logout
// Tears down the session. Idempotent - calling it when no one is logged
// in is a no-op rather than an error.
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  });
});

// GET /auth/me
// Returns the currently logged-in user (or null). The frontend calls
// this on every page load to know whether to render "Sign in" or the
// user's avatar + name.
router.get('/me', (req, res) => {
  // Passport exposes the user on req.user. If nobody's logged in,
  // req.user is undefined.
  if (!req.user) {
    return res.json({ user: null });
  }
  // Re-read the user from disk in case their profile changed since
  // the session was created. Strip providerId - it's an internal join
  // key and not safe to leak to the client.
  const fresh = getUserById(req.user.id);
  if (!fresh) {
    // User was deleted out from under the session. Force a logout.
    return req.logout(() => {
      res.json({ user: null });
    });
  }
  const { providerId, ...safeUser } = fresh;
  res.json({ user: safeUser });
});

module.exports = router;