// Routes for customer support chat.
//
// Data model:
//   threads: array of {
//     id, messages: [{ id, from: 'customer'|'admin'|'ai', text, timestamp }],
//     status: 'open' | 'closed',
//     lastReadByCustomerAt: ISO string | null,
//     lastReadByAdminAt:    ISO string | null,
//     createdAt, updatedAt,
//     escalated: boolean,         // true when the thread needs human attention
//     escalationReason: string|null, // 'keyword' | 'human_request' | 'ai_self_flag' | 'ai_offline'
//     aiHandled: boolean         // true forever once a human has replied (AI steps back)
//   }
//
// Customer endpoints are PUBLIC (no auth) - customers don't have accounts.
// Anyone with a thread ID can read it or post to it. This is the same trust
// model as a chat link / WhatsApp conversation URL.
// Admin endpoints are protected by requireAuth, like the orders routes.
//
// AI auto-responder: when a customer posts a message, the route calls
// generateSupportReply (backend/lib/aiSupport.js) to draft a reply. The
// reply is appended as a message with from: 'ai'. If the customer's text
// hits a complaint keyword, asks for a human, or the AI self-flags, the
// thread is marked escalated: true so the admin dashboard beeps.

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../auth');
const {
  generateSupportReply,
  FALLBACK_REPLY,
  COMPLAINT_KEYWORDS,
  HUMAN_REQUEST_KEYWORDS,
  matchedAny,
} = require('../lib/aiSupport');

const supportFilePath = path.join(__dirname, '..', 'data', 'support.json');

const ALLOWED_STATUSES = ['open', 'closed'];
const ALLOWED_FROM = ['customer', 'admin', 'ai'];

// Read all threads from the JSON file. Returns [] if the file is missing
// (first run) - we never want a 500 just because no one has ever chatted.
const readThreads = () => {
  try {
    if (!fs.existsSync(supportFilePath)) return [];
    const data = fs.readFileSync(supportFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading support.json:', error);
    return [];
  }
};

const writeThreads = (threads) => {
  try {
    // Make sure the data dir exists (it should, but be defensive).
    fs.mkdirSync(path.dirname(supportFilePath), { recursive: true });
    fs.writeFileSync(supportFilePath, JSON.stringify(threads, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing support.json:', error);
    return false;
  }
};

// Append a message to a thread. Mutates the thread object in place AND
// returns the new message so the caller can use it.
const appendMessage = (thread, from, text) => {
  const message = {
    id: uuidv4(),
    from,
    text,
    timestamp: new Date().toISOString(),
  };
  thread.messages.push(message);
  thread.updatedAt = message.timestamp;
  return message;
};

// Decide whether the customer's just-sent message should escalate the
// thread (i.e. a real human needs to follow up). Returns one of:
//   null             - no escalation
//   'human_request'  - customer asked to talk to a person
//   'keyword'        - complaint keyword matched
//   'ai_self_flag'   - AI returned needs_human: true
//   'ai_offline'     - AI unavailable; fall back to human
const classifyEscalation = (customerText, aiNeedsHuman, aiFailed) => {
  if (matchedAny(customerText, HUMAN_REQUEST_KEYWORDS)) return 'human_request';
  if (matchedAny(customerText, COMPLAINT_KEYWORDS)) return 'keyword';
  if (aiFailed) return 'ai_offline';
  if (aiNeedsHuman) return 'ai_self_flag';
  return null;
};

// Generate the AI's reply for the thread and append it. If the AI call
// fails (no key, rate limit, bad response) we still append a fallback
// reply so the customer isn't left hanging, and we mark the thread as
// escalated so a human takes over. Returns the AI message that was
// appended (or null if AI is permanently disabled, e.g. thread already
// human-handled).
const maybeGenerateAIReply = async (thread, customerText) => {
  // If a human has already taken ownership of this thread, the AI
  // permanently steps back. The customer will keep talking to the human.
  if (thread.aiHandled) return null;

  let aiText = null;
  let aiNeedsHuman = false;
  let aiFailed = false;

  try {
    const result = await generateSupportReply(thread);
    aiText = result.text;
    aiNeedsHuman = result.needsHuman;
  } catch (e) {
    console.error('[support] AI reply failed:', e.message, e.code || '');
    aiText = FALLBACK_REPLY;
    aiFailed = true;
  }

  if (aiText) {
    appendMessage(thread, 'ai', aiText);
  }

  const reason = classifyEscalation(customerText, aiNeedsHuman, aiFailed);
  if (reason) {
    thread.escalated = true;
    thread.escalationReason = reason;
  }

  return reason;
};

// ---- PUBLIC CUSTOMER ENDPOINTS ----

// POST /api/support/threads
// Body: { message: string }
// Creates a new thread with one initial customer message. Returns the thread
// (including its new id) so the client can store it in localStorage and reuse
// it on subsequent visits.
router.post('/threads', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'message is too long (max 5000 chars)' });
  }

  const now = new Date().toISOString();
  // If the client sent a thread ID, honor it. The customer page generates
  // a UUID up front and stores it in localStorage before the first message
  // is sent; using that same ID here means the first poll after the create
  // response will find the thread instead of 404'ing and wiping the message.
  const requestedId = typeof req.body.id === 'string' && req.body.id.trim()
    ? req.body.id.trim()
    : null;
  const thread = {
    id: requestedId || uuidv4(),
    messages: [],
    status: 'open',
    lastReadByCustomerAt: now,
    lastReadByAdminAt: null,
    createdAt: now,
    updatedAt: now,
    escalated: false,
    escalationReason: null,
    aiHandled: false,
  };
  appendMessage(thread, 'customer', message.trim());

  const threads = readThreads();
  threads.push(thread);

  // AI auto-reply. Runs before we write to disk so the AI message is
  // saved in the same write as the customer's first message. This means
  // the customer gets the AI reply in the same response body, not just
  // on the next 5-second poll.
  await maybeGenerateAIReply(thread, message.trim());

  if (!writeThreads(threads)) {
    return res.status(500).json({ error: 'Failed to save thread' });
  }
  res.status(201).json({ thread });
});

// GET /api/support/threads/:id - public.
// Returns the full thread so the customer's polling client can render the
// conversation including any admin replies.
router.get('/threads/:id', (req, res) => {
  const threads = readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  // Mark the thread as read by the customer. This drives the unread badge
  // on the admin side. Skip the disk write if it's already current, so a
  // 5s poll loop doesn't rewrite the file 12 times a minute.
  const now = new Date().toISOString();
  if (!thread.lastReadByCustomerAt || thread.lastReadByCustomerAt < now) {
    thread.lastReadByCustomerAt = now;
    writeThreads(threads);
  }
  res.json({ thread });
});

// POST /api/support/threads/:id/messages - public.
// Body: { text: string }. Appends a customer message. If the thread had been
// closed, opening it again so the admin sees it as needing attention.
router.post('/threads/:id/messages', async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: 'text is too long (max 5000 chars)' });
  }

  const threads = readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const message = appendMessage(thread, 'customer', text.trim());
  // Customer sent a new message - reopen the thread if it was closed.
  thread.status = 'open';
  thread.lastReadByCustomerAt = message.timestamp;
  // Escalation cleared once the customer is talking again. If a human
  // had already taken over (aiHandled), the AI stays out of the reply.
  thread.escalated = false;
  thread.escalationReason = null;

  // AI auto-reply. Skipped automatically if the thread is already
  // human-handled. Saves in the same write as the customer message so
  // the response includes the AI reply.
  await maybeGenerateAIReply(thread, text.trim());

  if (!writeThreads(threads)) {
    return res.status(500).json({ error: 'Failed to save message' });
  }
  res.status(201).json({ thread, message });
});

// ---- ADMIN ENDPOINTS (require auth) ----

// GET /api/support/threads - admin only.
// Returns all threads, sorted newest activity first. Each thread includes:
//   - `unreadByAdmin` - last message is from customer and not yet read
//   - `needsAttention` - AI flagged this and a human hasn't responded yet
router.get('/threads', requireAuth, (req, res) => {
  const threads = readThreads();
  threads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const enriched = threads.map((t) => {
    // Unread if the latest message is from the customer AND was sent after
    // the admin last read the thread.
    const last = t.messages[t.messages.length - 1];
    const unreadByAdmin =
      !!last &&
      last.from === 'customer' &&
      (!t.lastReadByAdminAt || new Date(last.timestamp) > new Date(t.lastReadByAdminAt));
    // needsAttention: the thread has been escalated by the AI AND the
    // admin hasn't replied since (so a reply would clear it). Once a
    // human replies, aiHandled becomes true and this stays false.
    const needsAttention = !!t.escalated && !t.aiHandled;
    return { ...t, unreadByAdmin, needsAttention };
  });

  res.json({ threads: enriched });
});

// POST /api/support/threads/:id/reply - admin only.
// Body: { text: string }. Appends an admin reply, marks the thread as
// read-by-admin.
router.post('/threads/:id/reply', requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: 'text is too long (max 5000 chars)' });
  }

  const threads = readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const message = appendMessage(thread, 'admin', text.trim());
  thread.lastReadByAdminAt = message.timestamp;
  // A human has now taken ownership of this thread. The AI steps back
  // permanently so the customer's next message goes to a real person.
  thread.aiHandled = true;
  thread.escalated = false;
  thread.escalationReason = null;

  if (!writeThreads(threads)) {
    return res.status(500).json({ error: 'Failed to save reply' });
  }
  res.status(201).json({ thread, message });
});

// PATCH /api/support/threads/:id/status - admin only.
// Body: { status: 'open' | 'closed' }. Used to close a resolved thread
// (or reopen one that needs more work).
router.patch('/threads/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }
  const threads = readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  thread.status = status;
  thread.updatedAt = new Date().toISOString();
  if (!writeThreads(threads)) {
    return res.status(500).json({ error: 'Failed to update status' });
  }
  res.json({ thread });
});

// POST /api/support/threads/:id/read - admin only.
// Marks the thread as read-by-admin so the unread badge clears. Called when
// the admin opens a thread.
router.post('/threads/:id/read', requireAuth, (req, res) => {
  const threads = readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  thread.lastReadByAdminAt = new Date().toISOString();
  // Opening the thread (even just to read) is enough for the admin to
  // take over. The AI steps back so any future customer messages go to
  // a human, not back to Claude.
  thread.aiHandled = true;
  thread.escalated = false;
  thread.escalationReason = null;
  if (!writeThreads(threads)) {
    return res.status(500).json({ error: 'Failed to mark read' });
  }
  res.json({ thread });
});

module.exports = router;
