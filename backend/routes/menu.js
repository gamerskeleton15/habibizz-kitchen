const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../auth');

// Path to the menu data file
const menuFilePath = path.join(__dirname, '..', 'data', 'menu.json');

// Read the menu array (or [] if missing/corrupt).
const readMenu = () => {
  try {
    return JSON.parse(fs.readFileSync(menuFilePath, 'utf8'));
  } catch (e) {
    console.error('Error reading menu:', e);
    return [];
  }
};

// Write the menu array to disk.
const writeMenu = (menu) => {
  try {
    fs.writeFileSync(menuFilePath, JSON.stringify(menu, null, 2));
    return true;
  } catch (e) {
    console.error('Error writing menu:', e);
    return false;
  }
};

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
router.get('/', (req, res) => {
  try {
    const data = fs.readFileSync(menuFilePath, 'utf8');
    const menu = JSON.parse(data);

    // Filter by category if provided
    if (req.query.category) {
      const filtered = menu.filter(item => item.category.toLowerCase() === req.query.category.toLowerCase());
      return res.json(filtered);
    }

    res.json(menu);
  } catch (error) {
    console.error('Error reading menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/menu - create a new menu item. Admin only.
// Body: { name, price, category, description?, tags?, imageUrl? }
router.post('/', requireAuth, (req, res) => {
  const fields = sanitizeFields(req.body);

  // name and category must be present; price must be a number (0+)
  if (!fields.name || !fields.category) {
    return res.status(400).json({
      error: 'name and category are required',
    });
  }
  if (typeof fields.price !== 'number') {
    return res.status(400).json({ error: 'a numeric price is required' });
  }

  const menu = readMenu();
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
  if (writeMenu(menu)) {
    res.status(201).json({ message: 'Item added', item: newItem });
  } else {
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// PATCH /api/menu/:id - update an existing menu item. Admin only.
router.patch('/:id', requireAuth, (req, res) => {
  const menu = readMenu();
  const index = menu.findIndex((item) => String(item.id) === String(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const fields = sanitizeFields(req.body);
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Merge changes onto the existing item.
  menu[index] = { ...menu[index], ...fields };

  if (writeMenu(menu)) {
    res.json({ message: 'Item updated', item: menu[index] });
  } else {
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// DELETE /api/menu/:id - remove a menu item. Admin only.
router.delete('/:id', requireAuth, (req, res) => {
  const menu = readMenu();
  const index = menu.findIndex((item) => String(item.id) === String(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const removed = menu[index];
  menu.splice(index, 1);
  if (writeMenu(menu)) {
    res.json({ message: 'Item removed', item: removed });
  } else {
    res.status(500).json({ error: 'Failed to save item' });
  }
});

module.exports = router;