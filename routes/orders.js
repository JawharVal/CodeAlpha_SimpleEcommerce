const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();
// helper: group flat rows into orders with items
function groupOrders(rows) {
    const map = new Map();
    for (const r of rows) {
        if (!map.has(r.order_id)) {
            map.set(r.order_id, {
                id: r.order_id,
                total: r.total,
                status: r.status,
                payment_method: r.payment_method,
                created_at: r.created_at,
                shipping_name: r.shipping_name,
                shipping_address: r.shipping_address,
                shipping_city: r.shipping_city,
                shipping_zip: r.shipping_zip,
                shipping_country: r.shipping_country,
                items: []
            });
        }
        map.get(r.order_id).items.push({
            product_id: r.product_id,
            title: r.title,
            image_url: r.image_url,
            quantity: r.quantity,
            unit_price: r.unit_price
        });
    }
    return Array.from(map.values());
}

// Checkout - Create Order
router.post('/', requireAuth, (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const ship = req.body?.shipping || {};
    const payment_method = req.body.payment_method || 'COD';  // Default to 'COD' if no method is provided
    let status = payment_method === 'COD' ? 'PENDING' : 'PAID';  // Set status to 'PENDING' for COD, 'PAID' otherwise

    // Check if the cart items exist
    if (!items.length) return res.status(400).json({ message: 'No items in cart' });

    // Validate shipping information
    for (const k of ['name', 'address', 'city', 'zip', 'country']) {
        if (!ship[k]) return res.status(400).json({ message: `Missing shipping.${k}` });
    }

    // Begin database transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const ids = items.map(i => i.productId);
        const placeholders = ids.map(() => '?').join(',');

        // Retrieve products from the database
        db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, ids, (err, prods) => {
            if (err) return rollback(res, 'DB error retrieving products');

            const map = new Map(prods.map(p => [p.id, p]));
            let total = 0;

            // Validate items
            for (const it of items) {
                const p = map.get(it.productId);
                if (!p) return rollback(res, `Product ${it.productId} not found`);
                if (it.qty <= 0) return rollback(res, 'Invalid quantity');
                if (p.stock < it.qty) return rollback(res, `Insufficient stock for "${p.title}"`);
                total += p.price * it.qty;
            }

            // Insert order into database
            db.run(
                `INSERT INTO orders (user_id, total, status, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, total, status, ship.name, ship.address, ship.city, ship.zip, ship.country, payment_method],
                function (err2) {
                    if (err2) return rollback(res, 'DB error creating order');
                    const orderId = this.lastID;

                    // Insert items into order_items table and update product stock
                    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)');
                    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id=?');
                    for (const it of items) {
                        const p = map.get(it.productId);
                        insertItem.run(orderId, it.productId, it.qty, p.price);
                        updateStock.run(it.qty, it.productId);
                    }
                    insertItem.finalize();
                    updateStock.finalize();

                    // Commit the transaction
                    db.run('COMMIT', (err3) => {
                        if (err3) return rollback(res, 'Commit failed');
                        res.json({ orderId, total, status });
                    });
                });
        });
    });
});
// GET /api/orders/me/full  -> orders with items (title, image_url, qty, price)
router.get('/me/full', requireAuth, (req, res) => {
    const sql = `
    SELECT
      o.id AS order_id, o.total, o.status, o.payment_method, o.created_at,
      o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_zip, o.shipping_country,
      oi.product_id, oi.quantity, oi.unit_price,
      p.title, p.image_url
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC, oi.id ASC
  `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        res.json(groupOrders(rows));
    });
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid order id' });

    db.serialize(() => {
        db.get('SELECT * FROM orders WHERE id=? AND user_id=?', [id, req.user.id], (e, order) => {
            if (e) return res.status(500).json({ message: 'DB error' });
            if (!order) return res.status(404).json({ message: 'Order not found' });
            if (order.status === 'CANCELLED') return res.status(400).json({ message: 'Already cancelled' });
            if (order.status === 'SHIPPED') return res.status(400).json({ message: 'Already shipped' });
            // For demo, allow cancel in PAID/PENDING states
            db.run('BEGIN TRANSACTION');

            db.all('SELECT product_id, quantity FROM order_items WHERE order_id=?', [id], (e2, items) => {
                if (e2) { db.run('ROLLBACK'); return res.status(500).json({ message: 'DB error' }); }

                const upd = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
                for (const it of items) upd.run(it.quantity, it.product_id);
                upd.finalize();

                db.run('UPDATE orders SET status="CANCELLED" WHERE id=?', [id], (e3) => {
                    if (e3) { db.run('ROLLBACK'); return res.status(500).json({ message: 'DB error' }); }
                    db.run('COMMIT', (e4) => {
                        if (e4) return res.status(500).json({ message: 'Commit failed' });
                        res.json({ id, status: 'CANCELLED' });
                    });
                });
            });
        });
    });
});

router.post('/:id/cancel', requireAuth, (req, res) => {
    const { id } = req.params;
    const status = 'CANCELLED';

    // Check if the order is PENDING before cancelling
    db.run(
        `UPDATE orders SET status = ? WHERE id = ? AND user_id = ? AND status = 'PENDING'`,
        [status, id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ message: 'Failed to cancel' });
            if (this.changes === 0) return res.status(400).json({ message: 'Order not found or cannot cancel' });
            res.json({ message: 'Order cancelled successfully' });
        }
    );
});
// Helper function for rolling back transaction
function rollback(res, msg) {
    db.run('ROLLBACK', () => res.status(400).json({ message: msg }));
}

module.exports = router;
