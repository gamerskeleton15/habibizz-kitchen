// Routes for customer support chat.
// On Vercel, threads are stored in Upstash Redis (see backend/lib/store.js)
// instead of backend/data/support.json. The API contract is unchanged.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../auth');
const store = require('../lib/store');
const {
  generateSupportReply,
  FALLBACK_REPLY,
  COMPLAINT_KEYWORDS,
  HUMAN_REQUEST_KEYWORDS,
  matchedAny,
} = require('../lib/aiSupport');

const ALLOWED_STATUSES = ['open', 'closed'];

const readThreads = () => store.readThreads();
const writeThreads = (threads) => store.writeThreads(threads);

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

const classifyEscalation = (customerText, aiNeedsHuman, aiFailed) => {
  if (matchedAny(customerText, HUMAN_REQUEST_KEYWORDS)) return 'human_request';
  if (matchedAny(customerText, COMPLAINT_KEYWORDS)) return 'keyword';
  if (aiFailed) return 'ai_offline';
  if (aiNeedsHuman) return 'ai_self_flag';
  return null;
};

const maybeGenerateAIReply = async (thread, customerText) => {
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

  if (aiText) appendMessage(thread, 'ai', aiText);

  const reason = classifyEscalation(customerText, aiNeedsHuman, aiFailed);
  if (reason) {
    thread.escalated = true;
    thread.escalationReason = reason;
  }
  return reason;
};

// ---- PUBLIC CUSTOMER ENDPOINTS ----

router.post('/threads', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'message is too long (max 5000 chars)' });
  }

  const now = new Date().toISOString();
  const requestedId =
    typeof req.body.id === 'string' && req.body.id.trim() ? req.body.id.trim() : null;
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

  const threads = await readThreads();
  threads.push(thread);
  await maybeGenerateAIReply(thread, message.trim());
  await writeThreads(threads);
  res.status(201).json({ thread });
});

router.get('/threads/:id', async (req, res) => {
  const threads = await readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const now = new Date().toISOString();
  if (!thread.lastReadByCustomerAt || thread.lastReadByCustomerAt < now) {
    thread.lastReadByCustomerAt = now;
    await writeThreads(threads);
  }
  res.json({ thread });
});

router.post('/threads/:id/messages', async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: 'message is too long (max 5000 chars)' });
  }

  const threads = await readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const message = appendMessage(thread, 'customer', text.trim());
  thread.status = 'open';
  thread.lastReadByCustomerAt = message.timestamp;
  thread.escalated = false;
  thread.escalationReason = null;

  await maybeGenerateAIReply(thread, text.trim());
  await writeThreads(threads);
  res.status(201).json({ thread, message });
});

// ---- ADMIN ENDPOINTS ----

router.get('/threads', requireAuth, async (req, res) => {
  const threads = await readThreads();
  threads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const enriched = threads.map((t) => {
    const last = t.messages[t.messages.length - 1];
    const unreadByAdmin =
      !!last &&
      last.from === 'customer' &&
      (!t.lastReadByAdminAt || new Date(last.timestamp) > new Date(t.lastReadByAdminAt));
    const needsAttention = !!t.escalated && !t.aiHandled;
    return { ...t, unreadByAdmin, needsAttention };
  });
  res.json({ threads: enriched });
});

router.post('/threads/:id/reply', requireAuth, async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: 'message is too long (max 5000 chars)' });
  }

  const threads = await readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const message = appendMessage(thread, 'admin', text.trim());
  thread.lastReadByAdminAt = message.timestamp;
  thread.aiHandled = true;
  thread.escalated = false;
  thread.escalationReason = null;

  await writeThreads(threads);
  res.status(201).json({ thread, message });
});

router.patch('/threads/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }
  const threads = await readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  thread.status = status;
  thread.updatedAt = new Date().toISOString();
  await writeThreads(threads);
  res.json({ thread });
});

router.post('/threads/:id/read', requireAuth, async (req, res) => {
  const threads = await readThreads();
  const thread = threads.find((t) => t.id === req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  thread.lastReadByAdminAt = new Date().toISOString();
  thread.aiHandled = true;
  thread.escalated = false;
  thread.escalationReason = null;
  await writeThreads(threads);
  res.json({ thread });
});

module.exports = router;
