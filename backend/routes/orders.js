// Routes for orders: create, list, fetch by id, update status.
// On Vercel, orders are stored in Upstash Redis (see backend/lib/store.js)
// instead of backend/data/orders.json. The API contract is unchanged.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../auth');
const store = require('../lib/store');

const ALLOWED_STATUSES = ['new', 'preparing', 'ready', 'completed'];

// Read all orders, backfilling a missing 'status' field to 'new'.
const readOrders = async () => {
  const orders = await store.readOrders();
  let needsBackfill = false;
  for (const o of orders) {
    if (typeof o.status !== 'string' || !ALLOWED_STATUSES.includes(o.status)) {
      o.status = 'new';
      needsBackfill = true;
    }
  }
  if (needsBackfill) {
    await store.writeOrders(orders);
  }
  return orders;
};

const writeOrders = (orders) => store.writeOrders(orders);

// POST /api/orders - create a new order
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, fulfillmentType, notes, items } = req.body;

    if (!name || !phone || !fulfillmentType || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: name, phone, fulfillmentType, and items are required',
      });
    }
    if (fulfillmentType === 'Delivery' && !address) {
      return res.status(400).json({ error: 'Address is required for delivery' });
    }

    let total = 0;
    items.forEach((item) => {
      total += item.price * item.quantity;
    });

    const orderNumber = `HK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: uuidv4(),
      orderNumber,
      name,
      phone,
      address: fulfillmentType === 'Delivery' ? address : '',
      fulfillmentType,
      notes: notes || '',
      items,
      total,
      paymentMethod: 'cash',
      status: 'new',
      timestamp: new Date().toISOString(),
    };

    const orders = await readOrders();
    orders.push(newOrder);
    await writeOrders(orders);
    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders - list all orders (newest first). Admin only.
router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await readOrders();
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Daily history / archive -----------------------------------------

const localDateKey = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

router.get('/history/dates', requireAuth, async (req, res) => {
  try {
    const orders = await readOrders();
    const byDay = {};
    for (const o of orders) {
      const key = localDateKey(o.timestamp);
      if (!key) continue;
      byDay[key] = byDay[key] || { date: key, count: 0, total: 0 };
      byDay[key].count += 1;
      byDay[key].total += o.total || 0;
    }
    const dates = Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
    res.json(dates);
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history/:date', requireAuth, async (req, res) => {
  try {
    const orders = (await readOrders())
      .filter((o) => localDateKey(o.timestamp) === req.params.date)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching day orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history/:date/export', requireAuth, async (req, res) => {
  try {
    const orders = (await readOrders())
      .filter((o) => localDateKey(o.timestamp) === req.params.date)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const headers = ['Order No', 'Time', 'Name', 'Phone', 'Fulfillment', 'Address', 'Items', 'Notes', 'Total', 'Status'];
    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.timestamp).toLocaleString(),
      o.name,
      o.phone,
      o.fulfillmentType,
      o.address || '',
      (o.items || [])
        .map((i) => `${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})`)
        .join(' | '),
      o.notes || '',
      (o.total || 0).toFixed(2),
      o.status,
    ]);

    const csv =
      headers.map(csvCell).join(',') +
      '\n' +
      rows.map((r) => r.map(csvCell).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="habibizz-orders-${req.params.date}.csv"`);
    res.send('﻿' + csv);
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/track/:orderNumber', async (req, res) => {
  try {
    const orders = await readOrders();
    const order = orders.find(
      (o) => o.orderNumber.toLowerCase() === req.params.orderNumber.toLowerCase()
    );
    if (order) res.json(order);
    else res.status(404).json({ error: 'Order not found' });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orders = await readOrders();
    const order = orders.find((o) => o.id === req.params.id);
    if (order) res.json(order);
    else res.status(404).json({ error: 'Order not found' });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }
    const orders = await readOrders();
    const orderIndex = orders.findIndex((o) => o.id === req.params.id);
    if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });

    orders[orderIndex].status = status;
    await writeOrders(orders);
    res.json({ message: 'Order status updated', order: orders[orderIndex] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
