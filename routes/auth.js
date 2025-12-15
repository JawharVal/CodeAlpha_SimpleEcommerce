const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

router.post('/register', (req, res) => {
    const { name, email, password, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country } = req.body || {};

    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const password_hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(
        name,
        email.toLowerCase(),
        password_hash,
        shipping_name || null,
        shipping_address || null,
        shipping_city || null,
        shipping_zip || null,
        shipping_country || null,
        function (err) {
            if (err) {
                if (String(err).includes('UNIQUE')) return res.status(409).json({ message: 'Email already registered' });
                return res.status(500).json({ message: 'DB error' });
            }
            const user = { id: this.lastID, name, email: email.toLowerCase(), role: 'user' };
            const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user });
        }
    );
});



router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], (err, row) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        if (!row) return res.status(401).json({ message: 'Invalid credentials' });
        const ok = bcrypt.compareSync(password, row.password_hash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
        const user = { id: row.id, name: row.name, email: row.email, role: row.role || 'user' };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    });
});

module.exports = router;
