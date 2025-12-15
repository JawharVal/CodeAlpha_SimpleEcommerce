const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
    db.get(
        `SELECT id,name,email,role,shipping_name,shipping_address,shipping_city,shipping_zip,shipping_country,avatar_url
     FROM users WHERE id=?`,
        [req.user.id],
        (err, row) => err ? res.status(500).json({message:'DB error'}) : res.json(row)
    );
});

router.get('/me/profile', requireAuth, (req, res) => {
    db.get(
        `SELECT shipping_name,shipping_address,shipping_city,shipping_zip,shipping_country,avatar_url
     FROM users WHERE id=?`,
        [req.user.id],
        (err, row) => err ? res.status(500).json({message:'DB error'}) : res.json(row || {})
    );
});

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
