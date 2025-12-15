// --- Same-origin image proxy with fallback ---
const FALLBACK_PATH = path.join(__dirname, 'public', 'img', 'fallback.svg');

function serveFallback(res) {
    try {
        const buf = fs.readFileSync(FALLBACK_PATH);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.status(200).end(buf);
    } catch {
        res.status(204).end();
    }
}

app.get('/proxy-img', async (req, res) => {
    try {
        const u = req.query.u;
        if (!u) return res.status(400).send('Missing ?u=');
        const url = new URL(u);

        // allow-list remote hosts
        const ALLOWED = new Set(['picsum.photos', 'images.unsplash.com', 'source.unsplash.com']);
        if (!ALLOWED.has(url.hostname)) return res.status(400).send('Host not allowed');

        const r = await fetch(u, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            },
            redirect: 'follow'
        });

        if (!r.ok) {
            console.error('proxy upstream', r.status, r.statusText, u);
            return serveFallback(res);
        }

        const type = r.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const buf = Buffer.from(await r.arrayBuffer());
        res.end(buf);
    } catch (e) {
        console.error('proxy error', e);
        serveFallback(res);
    }
});
