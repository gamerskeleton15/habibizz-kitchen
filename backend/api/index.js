// Vercel serverless entry. We export the Express app directly; Vercel
// wraps it in a serverless function. All /api/* and /auth/* requests
// land here (configured via vercel.json rewrites).
//
// We do NOT call app.listen() — serverless functions are request/response
// only, no long-lived socket.

const app = require('../app');

module.exports = app;
