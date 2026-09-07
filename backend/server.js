// Local development entry point only.
// On Vercel, api/index.js is the entry; this file is never run there.
//
// It just builds the same Express app and listens on PORT (default 4000),
// which is what the Vite dev server's proxy expects.

const app = require('./app');
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
