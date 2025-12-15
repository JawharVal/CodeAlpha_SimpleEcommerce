// scripts/migrate.js
const db = require('../db');
const alters = [
    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
    "ALTER TABLE users ADD COLUMN shipping_name TEXT",
    "ALTER TABLE users ADD COLUMN shipping_address TEXT",
    "ALTER TABLE users ADD COLUMN shipping_city TEXT",
    "ALTER TABLE users ADD COLUMN shipping_zip TEXT",
    "ALTER TABLE users ADD COLUMN shipping_country TEXT",
    "ALTER TABLE users ADD COLUMN avatar_url TEXT"
];
db.serialize(() => {
    let left = alters.length;
    alters.forEach(sql => db.run(sql, err => {
        console.log(sql, err ? `(skip: ${err.message})` : 'OK');
        if (--left === 0) process.exit(0);
    }));
});
