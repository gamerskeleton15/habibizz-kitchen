// Routes for orders: create, list, fetch by id, update status.
// Orders are stored in backend/data/orders.json as a simple JSON file data store.

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../auth');

// Path to the orders data file
const ordersFilePath = path.join(__dirname, '..', 'data', 'orders.json');

// Allowed order statuses (used to validate status updates)
const ALLOWED_STATUSES = ['new', 'preparing', 'ready', 'completed'];

// Helper function to read orders from file
const readOrders = () => {
  try {
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    const orders = JSON.parse(data);
    // Backfill: any order that predates the `status` field is treated as 'new'.
    // The dashboard groups by status, so missing-status orders would otherwise
    // be invisible. Mutating on read is fine because the next writeOrder() call
    // will persist the corrected field.
    let needsBackfill = false;
    for (const o of orders) {
      if (typeof o.status !== 'string' || !ALLOWED_STATUSES.includes(o.status)) {
        o.status = 'new';
        needsBackfill = true;
      }
    }
    if (needsBackfill) {
      writeOrders(orders);
    }
    return orders;
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
};

// Helper function to write orders to file
const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing orders:', error);
    return false;
  }
};

// POST /api/orders - create a new order
// Body: { name, phone, address?, fulfillmentType, notes?, items: [...] }
router.post('/', (req, res) => {
  try {
    const { name, phone, address, fulfillmentType, notes, items } = req.body;

    // Validation
    if (!name || !phone || !fulfillmentType || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, fulfillmentType, and items are required' });
    }

    if (fulfillmentType === 'Delivery' && !address) {
      return res.status(400).json({ error: 'Address is required for delivery' });
    }

    // Calculate total price from items server-side
    let total = 0;
    items.forEach(item => {
      total += item.price * item.quantity;
    });

    // Generate order number
    const orderNumber = `HK-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create new order object
    // Status starts as 'new' so the shopkeeper sees it as a brand-new request
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
      paymentMethod: 'cash', // Cash on Delivery/Pickup
      status: 'new',
      timestamp: new Date().toISOString()
    };

    // Read existing orders, add new one, write back
    const orders = readOrders();
    orders.push(newOrder);
    if (writeOrders(orders)) {
      res.status(201).json({
        message: 'Order created successfully',
        order: newOrder
      });
    } else {
      res.status(500).json({ error: 'Failed to save order' });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders - list all orders (newest first)
// Used by the admin dashboard to display incoming requests.
// Protected: only logged-in admins can see the full order list.
router.get('/', requireAuth, (req, res) => {
  try {
    const orders = readOrders();
    // Sort newest first so the shopkeeper sees the most recent at the top
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Daily history / archive -----------------------------------------
// The shopkeeper works on a live board today; every past day is archived
// and browsable/downloadable by date. Dates are local-time based (the
// shopkeeper thinks in store-local days, not UTC).

// Convert an ISO timestamp to a local YYYY-MM-DD key, or null if invalid.
const localDateKey = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Escape one cell of a CSV row (quote if it contains commas/quotes/newlines).
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// GET /api/orders/history/dates - one summary row per day that has orders.
// Protected. Returns [{ date: 'YYYY-MM-DD', count, total }] newest first.
router.get('/history/dates', requireAuth, (req, res) => {
  try {
    const orders = readOrders();
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

// GET /api/orders/history/:date - all orders placed on a given day.
// Protected.
router.get('/history/:date', requireAuth, (req, res) => {
  try {
    const orders = readOrders()
      .filter((o) => localDateKey(o.timestamp) === req.params.date)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching day orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/history/:date/export - download a day's orders as CSV.
// Protected. Ready to open in Excel/Google Sheets.
router.get('/history/:date/export', requireAuth, (req, res) => {
  try {
    const orders = readOrders()
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
    // Prepend a UTF-8 BOM so Excel renders headers correctly.
    res.send('﻿' + csv);
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/track/:orderNumber - look up an order by its customer-facing
// order number (e.g. "HK-1234"). Used by the customer-facing "Track Order" flow,
// where the customer only knows the HK-XXXX number, not the internal UUID.
router.get('/track/:orderNumber', (req, res) => {
  try {
    const orders = readOrders();
    const order = orders.find(
      (o) => o.orderNumber.toLowerCase() === req.params.orderNumber.toLowerCase()
    );
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id - get a specific order by internal UUID
router.get('/:id', (req, res) => {
  try {
    const orders = readOrders();
    const order = orders.find(o => o.id === req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/status - update the status of an order
// Body: { status: 'new' | 'preparing' | 'ready' | 'completed' }
// Protected: only logged-in admins can change order status.
router.patch('/:id/status', requireAuth, (req, res) => {
  try {
    const { status } = req.body;

    // Validate the new status
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`
      });
    }

    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o.id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update the status
    orders[orderIndex].status = status;

    if (writeOrders(orders)) {
      res.json({
        message: 'Order status updated',
        order: orders[orderIndex]
      });
    } else {
      res.status(500).json({ error: 'Failed to save order' });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;