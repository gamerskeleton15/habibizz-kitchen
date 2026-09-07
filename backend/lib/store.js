// Storage layer that mirrors the old JSON-file API but lives in Upstash
// Redis. Every key holds a JSON-serialized array/object, identical in
// shape to the previous data/*.json files. Routes call readX/writeX
// exactly like before; the on-disk-vs-Redis swap is invisible to them.
//
// Key layout:
//   menu:items          -> array of menu items
//   orders:list         -> array of orders
//   support:threads     -> array of threads
//   users:list          -> array of OAuth users
//   session:<token>     -> string "1" (value is irrelevant; the key's
//                          existence is what matters, with a 7d TTL)
//
// We do NOT use the in-memory Map for sessions anymore — cold starts
// would wipe them.

const { getClient } = require('./redis');

// 7 days in seconds, used for the session TTL.
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// Helper: fetch a JSON-encoded value, returning the fallback on miss or
// on any error. We never want a transient Redis hiccup to take the API
// down — at worst the customer sees a 500 and can retry.
const getJson = async (key, fallback) => {
  const r = getClient();
  if (!r) {
    throw new Error(
      'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  try {
    const v = await r.get(key);
    if (v == null) return fallback;
    if (typeof v === 'string') return JSON.parse(v);
    // @upstash/redis auto-parses JSON, so v might already be the object.
    return v;
  } catch (e) {
    console.error(`[store] get(${key}) failed:`, e.message);
    throw e;
  }
};

const setJson = async (key, value) => {
  const r = getClient();
  if (!r) {
    throw new Error(
      'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  // SET with no expiry — these are long-lived stores, not cache entries.
  await r.set(key, JSON.stringify(value));
};

// ---- Menu ----

const readMenu = async () => {
  const menu = await getJson('menu:items', null);
  if (menu) return menu;
  // First-run: if there's no menu in Redis yet, seed it from the file
  // we shipped in the repo. After that, edits are persisted to Redis
  // and the file becomes inert (kept only for fresh deploys).
  const seed = require('./menuSeed');
  await setJson('menu:items', seed);
  return seed;
};

const writeMenu = async (menu) => setJson('menu:items', menu);

// ---- Orders ----

const readOrders = async () => getJson('orders:list', []);
const writeOrders = async (orders) => setJson('orders:list', orders);

// ---- Support threads ----

const readThreads = async () => getJson('support:threads', []);
const writeThreads = async (threads) => setJson('support:threads', threads);

// ---- Users (OAuth) ----

const readUsers = async () => getJson('users:list', []);
const writeUsers = async (users) => setJson('users:list', users);

// ---- Admin sessions (replaces the in-memory Map + sessions.json) ----

// Each session is a single Redis key. Existence == valid, EX == 7d TTL.
// We store the createdAt timestamp as the value for diagnostics only;
// the requireAuth middleware does not need to read it.
const createSession = async (token) => {
  const r = getClient();
  if (!r) {
    throw new Error('Upstash Redis is not configured.');
  }
  const createdAt = Date.now();
  await r.set(`session:${token}`, String(createdAt), { ex: SESSION_TTL_SECONDS });
};

const isValidToken = async (token) => {
  if (!token) return false;
  const r = getClient();
  if (!r) return false;
  // EXPIRE re-sets the 7-day TTL on every authenticated request, so
  // active admins don't get logged out at the 7-day mark — only after
  // 7 days of *inactivity*. Matches the previous behavior.
  try {
    const v = await r.get(`session:${token}`);
    if (v == null) return false;
    await r.expire(`session:${token}`, SESSION_TTL_SECONDS);
    return true;
  } catch (e) {
    console.error('[store] isValidToken failed:', e.message);
    return false;
  }
};

const deleteSession = async (token) => {
  if (!token) return;
  const r = getClient();
  if (!r) return;
  try {
    await r.del(`session:${token}`);
  } catch (e) {
    console.error('[store] deleteSession failed:', e.message);
  }
};

module.exports = {
  readMenu,
  writeMenu,
  readOrders,
  writeOrders,
  readThreads,
  writeThreads,
  readUsers,
  writeUsers,
  createSession,
  isValidToken,
  deleteSession,
  SESSION_TTL_SECONDS,
};
