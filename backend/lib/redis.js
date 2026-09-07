// Upstash Redis client wrapper.
//
// Why Upstash?
// - FREE tier (10,000 commands/day, 256 MB) with NO credit/debit card required.
// - HTTP-based client works in Vercel serverless functions (no long-lived TCP
//   sockets, no connection-pooling state across cold starts).
// - Keys are small strings, which is exactly what our JSON-file data store
//   already gives us.
//
// Auth: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel
// environment variables. Get them from console.upstash.com -> Your DB ->
// "Connect" -> "REST".

const { Redis } = require('@upstash/redis');

let client = null;

const getClient = () => {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Don't throw at import time — the express app still starts. The
    // individual routes will throw a 500 with a clear message instead of
    // crashing the function with a vague "fetch failed".
    return null;
  }
  client = new Redis({ url, token });
  return client;
};

module.exports = { getClient };
