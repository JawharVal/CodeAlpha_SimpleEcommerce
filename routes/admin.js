const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });

const router = express.Router();
router.use(requireAuth, isAdmin);

// CREATE product
router.post('/products', upload.single('image'), (req, res) => {
    const { title, description, price, stock, category } = req.body;
    if (!title || !price) return res.status(400).json({ message:'Missing title/price' });
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const stmt = db.prepare(`INSERT INTO products (title,description,price,image_url,stock,category)
                           VALUES (?,?,?,?,?,?)`);
    stmt.run(title, description || '', Number(price), image_url, Number(stock||0), category || 'General',
        function(err){
            if (err) return res.status(500).json({ message:'DB error' });
            res.json({ id:this.lastID });
        });
});

// UPDATE product
router.put('/products/:id', upload.single('image'), (req, res) => {
    const { title, description, price, stock, category } = req.body;
    const fields = [], params = [];
    if (title) { fields.push('title=?'); params.push(title); }
    if (description!=null) { fields.push('description=?'); params.push(description); }
    if (price!=null) { fields.push('price=?'); params.push(Number(price)); }
    if (stock!=null) { fields.push('stock=?'); params.push(Number(stock)); }
    if (category) { fields.push('category=?'); params.push(category); }
    if (req.file) { fields.push('image_url=?'); params.push(`/uploads/${req.file.filename}`); }
    if (!fields.length) return res.status(400).json({ message:'No fields' });
    params.push(req.params.id);
    db.run(`UPDATE products SET ${fields.join(', ')} WHERE id=?`, params, function(err){
        if (err) return res.status(500).json({ message:'DB error' });
        res.json({ updated: this.changes });
    });
});

// DELETE product
router.delete('/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id=?', [req.params.id], function(err){
        if (err) return res.status(500).json({ message:'DB error' });
        res.json({ deleted: this.changes });
    });
});

module.exports = router;
