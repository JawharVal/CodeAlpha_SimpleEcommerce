const express = require('express');
const db = require('../db');
const router = express.Router();

/**
 * GET /api/products?q=&category=&sort=&page=&pageSize=
 * sort: price_asc | price_desc | new
 */
router.get('/', (req, res) => {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '12', 10)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (q) { where.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (category) { where.push('category = ?'); params.push(category); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    let orderBy = 'created_at DESC';
    if (req.query.sort === 'price_asc') orderBy = 'price ASC';
    if (req.query.sort === 'price_desc') orderBy = 'price DESC';
    if (req.query.sort === 'new') orderBy = 'created_at DESC';

    db.get(`SELECT COUNT(*) as cnt FROM products ${whereSql}`, params, (e, cntRow) => {
        if (e) return res.status(500).json({ message: 'DB error' });
        db.all(
            `SELECT * FROM products ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            [...params, pageSize, offset],
            (err, rows) => {
                if (err) return res.status(500).json({ message: 'DB error' });
                res.json({ items: rows, total: cntRow.cnt, page, pageSize });
            }
        );
    });
});

// details
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        if (!row) return res.status(404).json({ message: 'Not found' });
        res.json(row);
    });
});

module.exports = router;
