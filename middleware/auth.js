// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

module.exports = (req, res, next) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = auth.slice(7);
    try {
        req.user = jwt.verify(token, JWT_SECRET); // { id, name, email, role }
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};      
