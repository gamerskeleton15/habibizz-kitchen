// AI auto-responder for the customer support chat.
//
// When a customer sends a message, the support route calls
// `generateSupportReply(thread)` to draft a reply. The function reads the
// full thread history, asks Gemini for a JSON response of the form
// { "text": "...", "needs_human": true|false }, and returns it to the
// route. The route decides whether to mark the thread as escalated and
// what to append.
//
// Three escape hatches from AI to human:
//   1. COMPLAINT_KEYWORDS matched in the customer's latest message.
//   2. HUMAN_REQUEST_KEYWORDS matched (customer asked for a real person).
//   3. The model itself returns needs_human: true.
//
// On any Gemini API error (no key, rate limit, network) the route catches
// the typed error and falls back to FALLBACK_REPLY + escalation.

const { GoogleGenerativeAI } = require('@google/generative-ai');
const store = require('./store');

// ---- Configuration ----

// Model: gemini-3.6-flash is the current low-latency Gemini tier and
// replaces the older 2.5-flash. It has a generous free tier and supports
// structured JSON output, which is exactly what we need for the
// "JSON only" contract.
const MODEL = 'gemini-3.6-flash';
const MAX_OUTPUT_TOKENS = 400; // short replies only

// While Gemini is rate-limiting us, fail fast with the fallback instead
// of waiting on a doomed request. We only short-circuit the API call when
// the model is in cooldown (per the 429 body). A small buffer keeps us
// from log-spamming the same call once a minute.
let cooldownUntil = 0;
const COOLDOWN_BUFFER_MS = 5000;

// Brand info. Single source of truth — change here and the AI knows.
const BRAND = {
  name: 'Habibizz Kitchens',
  tagline: 'Bold flavor. Fast. No apologies.',
  address: '123 Flavor Street, Your City, ST 00000',
  phone: '(555) 555-1234',
  hours: 'Open every day, 11:00 AM to 10:00 PM',
  fulfillment: 'Cash on Delivery and Cash on Pickup only — we do not accept cards or online payments.',
  policy:
    'We do not take orders or modify existing orders through this chat. ' +
    'For order help, point the customer to the /orders page or tell them to call.',
};

// Fallback reply if the AI is offline. Escalation always accompanies this
// so a real human picks up the conversation.
const FALLBACK_REPLY =
  "Thanks for reaching out! Our team is tied up at the moment, but a real person will be with you shortly. We appreciate your patience.";

// ---- Escalation word lists ----
//
// Substring match (case-insensitive). Keep these small and obvious —
// false positives are fine (AI will still reply + escalate), false
// negatives are bad (the AI would keep replying to a complaint forever).

const COMPLAINT_KEYWORDS = [
  'refund',
  'refunds',
  'money back',
  'cold',
  'raw',
  'undercooked',
  'overcooked',
  'burnt',
  'sick',
  'vomit',
  'diarrhea',
  'food poisoning',
  'hair',
  'bug',
  'insect',
  'wrong order',
  'wrong item',
  'missing',
  'never arrived',
  "didn't arrive",
  'didnt arrive',
  'took too long',
  'too long',
  'late',
  'allergic',
  'allergy',
  'allergic reaction',
  'expired',
  'stale',
  'gross',
  'disgusting',
  'terrible',
  'awful',
  'horrible',
  'worst',
  'complaint',
  'complain',
  'report',
  'health department',
  'sue',
  'lawyer',
  'lawsuit',
  'legal',
  'unsafe',
];

const HUMAN_REQUEST_KEYWORDS = [
  'real person',
  'real human',
  'human please',
  'actual person',
  'actual human',
  'talk to someone',
  'speak to someone',
  'speak to a person',
  'speak to a human',
  'talk to a person',
  'talk to a human',
  'speak to manager',
  'talk to manager',
  'manager please',
  'the owner',
  'your boss',
  'agent',
  'representative',
  'live agent',
  'live person',
  'human agent',
  'customer service',
  'human support',
];

// ---- Helpers ----

const caseInsensitiveContains = (text, needle) =>
  typeof text === 'string' && text.toLowerCase().includes(needle.toLowerCase());

const matchedAny = (text, list) => list.some((kw) => caseInsensitiveContains(text, kw));

// Read the menu from Redis on every call so the AI's menu knowledge
// matches whatever the admin has just edited — no restart needed.
const loadMenu = async () => {
  try {
    const items = await store.readMenu();
    return items.map(
      (it) => `- ${it.name} (${it.category}) — $${Number(it.price).toFixed(2)}: ${it.description}`
    );
  } catch (e) {
    console.error('[aiSupport] Could not read menu:', e.message);
    return ['(menu unavailable)'];
  }
};

const buildSystemInstruction = async () => {
  const menuLines = (await loadMenu()).join('\n');
  return `You are the Habibizz Assistant for ${BRAND.name}, a fast-casual restaurant. Your job is to answer customer questions quickly and warmly, then hand off to a real human when needed.

# What you know
- Address: ${BRAND.address}
- Phone: ${BRAND.phone}
- Hours: ${BRAND.hours}
- Payment model: ${BRAND.fulfillment}
- Policies: ${BRAND.policy}

# Full menu
${menuLines}

# How to behave
- Keep replies short: under 80 words, 1-3 sentences. Use plain text, no markdown.
- Be friendly, energetic, and direct. Match the brand voice: "${BRAND.tagline}"
- Answer from the menu + info above. Never invent a menu item, price, or allergen detail.
- If the customer asks something you cannot confidently answer from the info above (e.g. the status of a specific order, a specific allergen detail, a refund for a past order), say so honestly and set needs_human: true.
- If the customer seems upset, frustrated, or asks to speak to a person, you may still send a short empathetic reply (one or two sentences) but set needs_human: true so a real person follows up.
- If the customer is just chatting, exploring the menu, or asking about hours/location, handle it yourself and set needs_human: false.
- Never make promises about delivery times or confirm an order that wasn't placed through the system.

# Output format
You MUST respond with valid JSON and nothing else. No prose, no markdown fences. Exactly this shape:
{"text": "<your reply to the customer, plain text>", "needs_human": <true|false>}

# Example 1 (routine)
Customer just said: "what time do you close?"
Your JSON response: {"text": "We're open every day from 11 AM to 10 PM — come by any time!", "needs_human": false}

# Example 2 (escalate)
Customer just said: "my order never showed up and i want my money back"
Your JSON response: {"text": "I'm really sorry to hear that — that's not the experience we want. A real person from the team is going to follow up with you right away to make it right.", "needs_human": true}`;
};

// ---- Gemini client (lazy) ----
//
// We read the key from GEMINI_API_KEY. We also accept GOOGLE_API_KEY for
// convenience, since Google's docs use both names interchangeably.

let model = null;
const getModel = async () => {
  if (model) return model;
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!key) return null;
  const client = new GoogleGenerativeAI(key);
  // responseMimeType: 'application/json' tells Gemini to emit a JSON
  // object directly, which makes the "JSON only" contract trivial to
  // enforce — we don't have to parse the prose, just JSON.parse the text.
  // buildSystemInstruction() is async because it reads the menu from
  // Redis. We memoize the model (and therefore the system instruction)
  // for the lifetime of this cold instance — the menu rarely changes
  // mid-session and re-reading on every request would add a Redis
  // round-trip to every AI call.
  model = client.getGenerativeModel({
    model: MODEL,
    systemInstruction: await buildSystemInstruction(),
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
    },
  });
  return model;
};

// ---- Public API ----

// Throws if GEMINI_API_KEY is missing or the API call fails. Caller
// should catch and fall back to FALLBACK_REPLY + escalation.
async function generateSupportReply(thread) {
  const gemini = await getModel();
  if (!gemini) {
    const err = new Error('GEMINI_API_KEY not set');
    err.code = 'AI_OFFLINE';
    throw err;
  }

  // Build the conversation transcript as a single user turn. We don't
  // alternate user/model roles because admin messages aren't from the AI
  // — they're from the shopkeeper. If we sent them as model turns, the
  // model would treat them as its own past replies and contradict itself.
  // A single transcript message is unambiguous and works for any thread
  // length.
  const transcriptLines = (thread.messages || []).map((m) => {
    const who =
      m.from === 'customer' ? 'CUSTOMER' : m.from === 'admin' ? 'ADMIN' : 'ASSISTANT';
    return `${who}: ${m.text}`;
  });
  const transcript = transcriptLines.length
    ? transcriptLines.join('\n')
    : '(no prior messages)';

  const userContent = `Conversation so far:\n${transcript}\n\nReply to the customer's latest message. Return JSON only.`;

  // Short-circuit if we're still in a cooldown window from a previous 429.
  if (Date.now() < cooldownUntil) {
    const err = new Error(
      `Gemini model cooling down for ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s`
    );
    err.code = 'AI_RATE_LIMITED';
    throw err;
  }

  let result;
  try {
    result = await gemini.generateContent(userContent);
  } catch (e) {
    // Try to extract a retry delay from the error. The Gemini SDK exposes
    // the parsed body on e.errorDetails for 4xx, but we also fall back to
    // a regex on the message string for safety.
    let retrySeconds = null;
    try {
      const haystack = JSON.stringify(e.errorDetails || e) + ' ' + (e.message || '');
      const m = /(?:retry[_\s-]?delay|retry[_\s-]?after)["':\s]+(\d+)/i.exec(haystack);
      if (m) retrySeconds = parseInt(m[1], 10);
    } catch {
      // ignore
    }
    if (retrySeconds) {
      cooldownUntil = Date.now() + retrySeconds * 1000 + COOLDOWN_BUFFER_MS;
    }
    // Pull the real status out of the SDK's error message. The SDK
    // includes the HTTP status in square brackets, e.g. "[404 ]" or
    // "[429 ]". e.status / e.statusCode aren't reliable across SDK
    // versions, so parsing the message is the most robust signal.
    const statusMatch = /\[(\d{3})\s*\]/.exec(e.message || '');
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
    const err = new Error(`Gemini API error: ${e.message || e}`);
    err.code = status === 429 ? 'AI_RATE_LIMITED' : 'AI_OFFLINE';
    err.cause = e;
    throw err;
  }

  // With responseMimeType: 'application/json' set, the text is already
  // valid JSON. We still strip a stray markdown fence in case the model
  // adds one anyway (defensive).
  const raw = (result.response.text() || '').trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const err = new Error(`Gemini returned non-JSON: ${raw.slice(0, 200)}`);
    err.code = 'AI_BAD_RESPONSE';
    err.cause = e;
    throw err;
  }

  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  const needsHuman = !!parsed.needs_human;
  if (!text) {
    const err = new Error('Gemini returned empty text');
    err.code = 'AI_BAD_RESPONSE';
    throw err;
  }

  return { text, needsHuman };
}

module.exports = {
  generateSupportReply,
  FALLBACK_REPLY,
  COMPLAINT_KEYWORDS,
  HUMAN_REQUEST_KEYWORDS,
  matchedAny,
};
