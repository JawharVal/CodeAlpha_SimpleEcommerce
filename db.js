const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'store.db'));

db.serialize(() => {
     db.run(`CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'user',
     shipping_name TEXT,
     shipping_address TEXT,
     shipping_city TEXT,
     shipping_zip TEXT,
     shipping_country TEXT,
     avatar_url TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);


    db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'General',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID' or 'PENDING'
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_zip TEXT,
  shipping_country TEXT,
  payment_method TEXT DEFAULT 'COD', -- 'COD', 'CARD', 'PAYPAL'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'authorized', 'declined'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
        )`);


    db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

});


module.exports = db;
