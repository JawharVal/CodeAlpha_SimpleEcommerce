const express = require('express');
const requireAuth = require('../middleware/auth');
const router = express.Router();

/**
 * POST /api/payments/simulate
 * Body: { method:'COD'|'CARD'|'PAYPAL', amount:number, card?:{number,exp,cvc} }
 * Rules:
 *  - COD -> ok pending
 *  - CARD -> last4 '4242' success, '0002' declined; others -> success
 *  - PAYPAL -> success (demo)
 */
router.post('/simulate', requireAuth, (req, res) => {
    const { method = 'COD', amount = 0, card = {} } = req.body || {};
    const m = String(method).toUpperCase();
    const txId = `${m}-${Date.now()}`;

    if (m === 'COD') return res.json({ ok: true, status: 'pending', txId });

    if (m === 'CARD') {
        const last4 = String(card.number || '').replace(/\s|-/g, '').slice(-4);
        if (last4 === '0002' || last4 === '0000') {
            return res.status(402).json({ ok: false, status: 'declined', code: 'card_declined', txId });
        }
        // success (demo)
        return res.json({ ok: true, status: 'authorized', txId, last4 });
    }

    // PAYPAL and others succeed in demo
    return res.json({ ok: true, status: 'authorized', txId });
});

module.exports = router;
