const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

// Get user basic profile info (name, email, etc.)
router.get('/me', requireAuth, (req, res) => {
    db.get(
        `SELECT id, name, email, role, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, avatar_url
         FROM users WHERE id=?`,
        [req.user.id],
        (err, row) => {
            if (err) return res.status(500).json({ message: 'DB error' });
            res.json(row);  // Returns user info including shipping and avatar_url
        }
    );
});

// Get user shipping info and avatar URL (profile-specific data)
// Get user profile data (shipping info, avatar, etc.)
router.get('/me/profile', requireAuth, (req, res) => {
    db.get(
        `SELECT shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, avatar_url
         FROM users WHERE id=?`,
        [req.user.id],
        (err, row) => {
            if (err) return res.status(500).json({ message: 'DB error' });
            res.json(row || {});  // Return profile data
        }
    );
});


// Update user shipping info
router.put('/me/profile', requireAuth, (req, res) => {
    const { shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country } = req.body || {};
    db.run(
        `UPDATE users SET shipping_name=?, shipping_address=?, shipping_city=?, shipping_zip=?, shipping_country=? WHERE id=?`,
        [shipping_name || null, shipping_address || null, shipping_city || null, shipping_zip || null, shipping_country || null, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ message: 'DB error' });
            res.json({ updated: this.changes });
        }
    );
});
// PUT /api/me/profile  (save shipping + optional name + avatar_url)
router.put('/me/profile', requireAuth, (req, res) => {
    const {
        name,
        shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country,
        avatar_url
    } = req.body || {};

    db.run(
        `UPDATE users
       SET name = COALESCE(?, name),
           shipping_name    = ?,
           shipping_address = ?,
           shipping_city    = ?,
           shipping_zip     = ?,
           shipping_country = ?,
           avatar_url       = COALESCE(?, avatar_url)
     WHERE id = ?`,
        [
            name || null,
            shipping_name || null,
            shipping_address || null,
            shipping_city || null,
            shipping_zip || null,
            shipping_country || null,
            avatar_url || null,
            req.user.id
        ],
        function (err) {
            if (err) return res.status(500).json({ message: 'DB error' });
            res.json({ updated: this.changes });
        }
    );
});


module.exports = router;
