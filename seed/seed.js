// seed/seed.js — local, CSP-safe images via data: URIs
const db = require('../db');

function svgDataUri(label, bg = '#111827') {
    const escape = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${bg}' stop-opacity='0.9'/>
          <stop offset='100%' stop-color='#000' stop-opacity='0.6'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <rect x='20' y='20' width='760' height='560' rx='24' ry='24' fill='rgba(255,255,255,0.06)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            font-family='system-ui,Arial,sans-serif' font-size='36' fill='#ffffff'>
        ${escape(label)}
      </text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const palette = ['#0ea5e9','#10b981','#a855f7','#f59e0b','#ef4444','#14b8a6','#64748b','#84cc16'];

const items = [
    // Electronics
    ['Wireless Headphones','ANC over-ear, 30h battery, USB-C',79.99,20,'Electronics'],
    ['Smart Watch','Fitness & sleep tracking, notifications',59.99,25,'Electronics'],
    ['Bluetooth Speaker','Portable, waterproof, punchy bass',39.90,30,'Electronics'],
    ['Portable Charger 20K','20,000mAh PD fast charge',29.50,40,'Electronics'],
    ['27" IPS Monitor','1440p QHD, 75Hz, slim bezels',189.00,10,'Electronics'],
    ['USB-C Hub 6-in-1','HDMI, USB-A x3, SD, PD passthrough',24.90,50,'Electronics'],

    // Accessories
    ['USB-C Cable (1m)','Nylon braided, 60W',6.99,120,'Accessories'],
    ['Phone Case','Matte TPU shock-absorbent',9.99,80,'Accessories'],
    ['Glass Screen Protector','9H tempered glass, 2-pack',7.50,90,'Accessories'],
    ['XL Mouse Pad','900×400 mm stitched edges',12.90,60,'Accessories'],

    // Bags
    ['Everyday Backpack 20L','Water-resistant, laptop pocket',34.99,35,'Bags'],
    ['Messenger Bag','Cross-body, padded sleeve',29.99,25,'Bags'],
    ['Travel Duffel','Carry-on friendly, 35L',44.00,18,'Bags'],

    // Home
    ['LED Desk Lamp','3 color temps, USB charging',18.99,40,'Home'],
    ['LED Light Strip 5m','RGB with remote',16.50,50,'Home'],
    ['Insulated Bottle 1L','Keeps cold 24h / hot 12h',14.99,70,'Home'],
    ['Ceramic Coffee Mug','350ml, matte finish',8.50,60,'Home'],

    // Books
    ['JavaScript Patterns','Best practices & idioms (2nd ed.)',22.00,15,'Books'],
    ['Learning React','Hooks & modern patterns',21.00,15,'Books'],
    ['Node.js in Action','Server-side JS from zero to prod',24.00,12,'Books'],

    // Fashion
    ['Fleece Hoodie','Unisex, relaxed fit',28.00,40,'Fashion'],
    ['Knit Beanie','Warm & soft, one size',9.50,55,'Fashion'],

    // Gaming / Audio
    ['Wireless Gamepad','PC/Android, low-latency',32.00,22,'Gaming'],
    ['Gaming Mouse','12k DPI, ergonomic',19.90,40,'Gaming'],
    ['USB Microphone','Cardioid condenser, plug-and-play',42.00,18,'Audio']
];

const products = items.map((it, i) => ({
    title: it[0],
    description: it[1],
    price: it[2],
    stock: it[3],
    category: it[4],
    image_url: svgDataUri(it[0], palette[i % palette.length])
}));

db.serialize(() => {
    db.run('DELETE FROM products', () => {
        const stmt = db.prepare(
            'INSERT INTO products (title,description,price,image_url,stock,category) VALUES (?,?,?,?,?,?)'
        );
        for (const p of products) {
            stmt.run(p.title, p.description, p.price, p.image_url, p.stock, p.category);
        }
        stmt.finalize(() => {
            console.log(`✅ Seeded ${products.length} products (all with local data: images)`);
            process.exit(0);
        });
    });
});
