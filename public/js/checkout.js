(function(){
    const log = (...a) => console.log('[checkout]', ...a);
    const ready = (fn)=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
    const $ = (id)=> document.getElementById(id);
    const money = n => '$' + Number(n||0).toFixed(2);
    const setMsg = (t, ok=false)=>{ const m=$('checkoutMsg'); if(!m) return; m.textContent=t; m.className='msg '+(ok?'ok':'err'); log('UI:',t); };
    const badge = ()=>{ const b=$('cartBadge'); if(!b) return; const c=Cart.load().reduce((s,i)=>s+i.qty,0); b.textContent = c? String(c):''; };

    async function prefill() {
        try {
            const prof = await API.get('/api/me/profile', true);
            $('shipName').value    = prof.shipping_name    || '';
            $('shipAddress').value = prof.shipping_address || '';
            $('shipCity').value    = prof.shipping_city    || '';
            $('shipZip').value     = prof.shipping_zip     || '';
            $('shipCountry').value = prof.shipping_country || '';
        } catch(e){ log('prefill failed', e); }
    }

    function renderSummary() {
        const list = $('sumList');
        const items = Cart.load();
        if (!items.length) {
            list.innerHTML = '<p class="muted">Your cart is empty. <a href="/cart.html">Go to cart</a>.</p>';
            $('sumTotal').textContent = '$0.00';
            $('placeBtn').disabled = true;
            return false;
        }
        $('placeBtn').disabled = false;

        list.innerHTML = items.map(i => `
      <div class="sum-row">
        <img class="sum-thumb" src="${i.image_url || '/img/fallback.svg'}"
             alt="${i.title}" onerror="this.onerror=null;this.src='/img/fallback.svg'">
        <div class="sum-title">${i.title}<div class="muted">x${i.qty} × ${money(i.price)}</div></div>
        <div class="sum-sub">${money(i.qty * i.price)}</div>
      </div>
    `).join('');
        $('sumTotal').textContent = money(Cart.total());
        return true;
    }

    function validateShipping(sh) {
        for (const [k,v] of Object.entries(sh)) if (!String(v||'').trim()) return `Please fill shipping ${k}.`;
        return '';
    }

    function validatePayment(method) {
        if (method !== 'CARD') return '';
        const num = $('cardNumber').value.replace(/\s+/g,'');
        const exp = $('cardExp').value.trim();
        const cvc = $('cardCvc').value.trim();
        if (num.length < 12) return 'Enter a valid card number';
        if (!/^\d{2}\/\d{2}$/.test(exp)) return 'Enter expiry as MM/YY';
        if (!/^\d{3,4}$/.test(cvc)) return 'Enter a valid CVC';
        return '';
    }

    // Fetch each product to check stock before placing order
    async function preflightStock(items) {
        const checks = await Promise.all(items.map(async it => {
            try {
                const p = await API.get('/api/products/'+it.productId);
                return { ok: p.stock >= it.qty, title: p.title, left: p.stock, want: it.qty };
            } catch {
                return { ok:false, title:`#${it.productId}`, left:0, want:it.qty };
            }
        }));
        const bad = checks.find(c => !c.ok);
        if (bad) return `Only ${bad.left} left for “${bad.title}”, you want ${bad.want}. Please adjust your cart.`;
        return '';
    }

    ready(async ()=>{
        log('init');
        API.refreshNav(); badge();

        if (!API.user()) {
            setMsg('Please log in to continue…', true);
            setTimeout(()=> location.href = '/login.html?next=/checkout.html', 600);
            return;
        }

        // build UI
        const ok = renderSummary();
        if (!ok) $('guard').textContent = '';
        else { $('guard').style.display='none'; $('co').style.display='grid'; }

        await prefill();

        // Payment UI
        const payMethod = $('payMethod'), cardBox = $('cardBox');
        payMethod.addEventListener('change', ()=> {
            cardBox.style.display = (payMethod.value === 'CARD') ? 'flex' : 'none';
        });

        // Place order
        $('placeBtn').addEventListener('click', async ()=>{
            const shipping = {
                name: $('shipName').value.trim(),
                address: $('shipAddress').value.trim(),
                city: $('shipCity').value.trim(),
                zip: $('shipZip').value.trim(),
                country: $('shipCountry').value.trim(),
            };
            const items = Cart.load().map(i => ({ productId: i.id, qty: i.qty }));
            if (!items.length) return setMsg('Cart is empty.');
            const sErr = validateShipping(shipping); if (sErr) return setMsg(sErr);
            const method = $('payMethod').value;
            const pErr = validatePayment(method); if (pErr) return setMsg(pErr);

            // stock pre-flight
            setMsg('Checking stock…', true);
            const stockErr = await preflightStock(items);
            if (stockErr) return setMsg(stockErr);

            try {
                $('placeBtn').disabled = true;
                // optional: simulate payment if your endpoint exists
                if (method !== 'COD') {
                    try {
                        const card = (method === 'CARD') ? {
                            number: $('cardNumber').value, exp: $('cardExp').value, cvc: $('cardCvc').value
                        } : undefined;
                        await API.post('/api/payments/simulate', { method, amount: Cart.total(), card }, true);
                    } catch (e) {
                        // If /simulate doesn't exist or declines, bubble message
                        return setMsg(e.message || 'Payment failed');
                    }
                }

                setMsg('Placing order…', true);
                const res = await API.post('/api/orders', { items, shipping, payment_method: method }, true);

                // save default shipping if opted in
                if ($('saveDefault').checked) {
                    try { await API.put('/api/me/profile', {
                        shipping_name: shipping.name, shipping_address: shipping.address,
                        shipping_city: shipping.city, shipping_zip: shipping.zip, shipping_country: shipping.country
                    }, true); } catch {}
                }

                Cart.clear(); badge();
                setMsg(`Order #${res.orderId} placed • ${money(res.total)} — ${method}`, true);
                setTimeout(()=> location.href='/orders.html', 700);
            } catch (e) {
                log('checkout error:', e);
                setMsg(e.message || 'Failed to place order');
            } finally {
                $('placeBtn').disabled = false;
            }
        });
    });
})();
