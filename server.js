// server.js
const express = require('express');

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
// Routes
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const meRoutes = require('./routes/me'); // <-- profile/me endpoints
const paymentsRoutes = require('./routes/payment');
// Create app BEFORE using it
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// APIs
// server.js (mount order and prefixes matter)
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api', meRoutes);            // /api/me, /api/me/profile
app.use('/api/admin', rateLimit({ windowMs: 60_000, max: 60 }), adminRoutes);
app.use('/api/payments', rateLimit({ windowMs: 60_000, max: 120 }), paymentsRoutes);

// Error handler (keep last)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
});
// --- same-origin image proxy to bypass CSP (allow-list) ---
app.get('/proxy-img', async (req, res) => {
    try {
        const u = req.query.u;
        if (!u) return res.status(400).send('Missing ?u=');
        const url = new URL(u);

        // Only allow known hosts
        const ALLOWED = new Set([
            'picsum.photos',
            'images.unsplash.com',
            'source.unsplash.com'
        ]);
        if (!ALLOWED.has(url.hostname)) return res.status(400).send('Host not allowed');

        const r = await fetch(u);
        if (!r.ok) return res.status(502).send('Upstream error');

        res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        const buf = Buffer.from(await r.arrayBuffer());
        res.end(buf);
    } catch (e) {
        console.error('proxy-img error', e);
        res.status(400).send('Bad URL');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
