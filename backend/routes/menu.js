// Routes for menu items.
// On Vercel, menu data lives in Upstash Redis (see backend/lib/store.js).
// The endpoints, request shapes, and response shapes are identical to the
// previous file-backed version so the frontend doesn't need to change.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth');
const store = require('../lib/store');

// Read the menu array (or [] if Redis is unconfigured / empty).
const readMenu = () => store.readMenu();

const writeMenu = (menu) => store.writeMenu(menu);

// Pick the next numeric id (existing items use integers: 1, 2, 3...).
const nextId = (menu) => {
  const max = menu.reduce((m, item) => {
    const id = typeof item.id === 'number' ? item.id : 0;
    return Math.max(m, id);
  }, 0);
  return max + 1;
};

// Normalize a partially-supplied item body into a clean field set, used by
// both create and update so they validate the same way.
const sanitizeFields = (body) => {
  const out = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    out.name = body.name.trim();
  }
  if (typeof body.description === 'string') {
    out.description = body.description.trim();
  }
  if (body.price !== undefined && body.price !== '') {
    const price = Number(body.price);
    if (!Number.isNaN(price) && price >= 0) out.price = price;
  }
  if (typeof body.category === 'string' && body.category.trim()) {
    out.category = body.category.trim();
  }
  if (body.tags !== undefined) {
    // Accept either an array or a comma-separated string, always an array.
    const arr = Array.isArray(body.tags)
      ? body.tags
      : String(body.tags).split(',').map((t) => t.trim()).filter(Boolean);
    out.tags = arr;
  }
  if (body.imageUrl !== undefined) {
    out.imageUrl = body.imageUrl.trim() || undefined;
  }
  return out;
};

// GET /api/menu - returns all menu items, optional ?category= filter
router.get('/', async (req, res) => {
  try {
    const menu = await readMenu();
    if (req.query.category) {
      const filtered = menu.filter(
        (item) => item.category.toLowerCase() === req.query.category.toLowerCase()
      );
      return res.json(filtered);
    }
    res.json(menu);
  } catch (error) {
    console.error('Error reading menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/menu - create a new menu item. Admin only.
router.post('/', requireAuth, async (req, res) => {
  const fields = sanitizeFields(req.body);
  if (!fields.name || !fields.category) {
    return res.status(400).json({ error: 'name and category are required' });
  }
  if (typeof fields.price !== 'number') {
    return res.status(400).json({ error: 'a numeric price is required' });
  }

  const menu = await readMenu();
  const newItem = {
    id: nextId(menu),
    name: fields.name,
    description: fields.description || '',
    price: fields.price,
    category: fields.category,
    tags: fields.tags || [],
  };
  if (fields.imageUrl) newItem.imageUrl = fields.imageUrl;

  menu.push(newItem);
  try {
    await writeMenu(menu);
    res.status(201).json({ message: 'Item added', item: newItem });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// PATCH /api/menu/:id - update an existing menu item. Admin only.
router.patch('/:id', requireAuth, async (req, res) => {
  const menu = await readMenu();
  const index = menu.findIndex((item) => String(item.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  const fields = sanitizeFields(req.body);
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  menu[index] = { ...menu[index], ...fields };

  try {
    await writeMenu(menu);
    res.json({ message: 'Item updated', item: menu[index] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// DELETE /api/menu/:id - remove a menu item. Admin only.
router.delete('/:id', requireAuth, async (req, res) => {
  const menu = await readMenu();
  const index = menu.findIndex((item) => String(item.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  const removed = menu[index];
  menu.splice(index, 1);
  try {
    await writeMenu(menu);
    res.json({ message: 'Item removed', item: removed });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save item' });
  }
});

module.exports = router;
