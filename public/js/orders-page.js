// public/js/orders-page.js
(function () {
    const $ = (id) => document.getElementById(id);
    const ordersEl = $('orders');
    const emptyEl  = $('emptyMsg');

    const state = { all: [], status: '', q: '' };

    function fmtDate(s) {
        if (!s) return '';
        const iso = s.replace(' ', 'T');
        const d = new Date(iso);
        return isNaN(d) ? s : d.toLocaleString();
    }

    function statusChip(s) {
        const cls = s === 'PAID' ? 'chip-paid'
            : s === 'PENDING' ? 'chip-pending'
                : s === 'CANCELLED' ? 'chip-cancelled' : 'chip';
        return `<span class="chip ${cls}">${s}</span>`;
    }

    function itemThumb(it) {
        const total = (it.unit_price * it.quantity).toFixed(2);
        return `
      <div class="order-item">
        <img src="${it.image_url || '/img/fallback.svg'}" alt="${it.title}"
             onerror="this.onerror=null;this.src='/img/fallback.svg'">
        <div class="order-item-meta">
          <div class="title">${it.title}</div>
          <div class="muted">x${it.quantity} · $${it.unit_price.toFixed(2)} — $${total}</div>
        </div>
      </div>`;
    }

    function card(o) {
        const canCancel = o.status === 'PAID' || o.status === 'PENDING';
        const itemsHtml = o.items.map(itemThumb).join('');
        const ship = [o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_zip, o.shipping_country]
            .filter(Boolean).join(', ');
        return `
    <section class="order-card" data-id="${o.id}">
      <div class="order-head">
        <div>
          <strong>#${o.id}</strong> — $${Number(o.total).toFixed(2)}
          ${o.payment_method ? `<span class="muted">(${o.payment_method})</span>` : ''}
        </div>
        <div class="right">
          ${statusChip(o.status)}
          <span class="muted">${fmtDate(o.created_at)}</span>
        </div>
      </div>

      <div class="order-body">
        <div class="order-items">${itemsHtml}</div>
        <div class="order-ship">
          <div class="muted">Ship to</div>
          <div>${ship || '—'}</div>
        </div>
      </div>

      <div class="order-actions">
        <button class="btn-light" data-act="details">Details</button>
        <button class="btn" data-act="reorder">Reorder</button>
        ${canCancel ? `<button class="btn-danger" data-act="cancel">Cancel</button>` : ''}
      </div>

      <div class="order-details" hidden>
        <table class="order-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${o.items.map(it => `
              <tr>
                <td>${it.title}</td>
                <td>${it.quantity}</td>
                <td>$${it.unit_price.toFixed(2)}</td>
                <td>$${(it.unit_price * it.quantity).toFixed(2)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3" class="right"><strong>Total</strong></td><td><strong>$${Number(o.total).toFixed(2)}</strong></td></tr>
          </tfoot>
        </table>
      </div>
    </section>`;
    }

    function applyFilters() {
        const q = state.q.trim().toLowerCase();
        let rows = state.all.slice();
        if (state.status) rows = rows.filter(o => o.status === state.status);
        if (q) {
            rows = rows.filter(o =>
                String(o.id).includes(q) ||
                (o.shipping_city || '').toLowerCase().includes(q) ||
                (o.shipping_country || '').toLowerCase().includes(q)
            );
        }
        if (!rows.length) {
            ordersEl.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }
        emptyEl.style.display = 'none';
        ordersEl.innerHTML = rows.map(card).join('');
    }

    async function load() {
        API.refreshNav();
        if (!API.user()) {
            ordersEl.innerHTML = '<p>Please log in.</p>';
            return;
        }
        ordersEl.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
        try {
            const rows = await API.get('/api/orders/me/full', true);
            state.all = Array.isArray(rows) ? rows : [];
            applyFilters();
        } catch (e) {
            ordersEl.innerHTML = `<p>${e.message || 'Failed to load orders'}</p>`;
        }
    }

    // Events
    document.addEventListener('DOMContentLoaded', () => {
        load();

        // Filter chips
        const chips = document.querySelectorAll('#filters .chip');
        chips.forEach(ch => ch.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('chip-active'));
            ch.classList.add('chip-active');
            state.status = ch.getAttribute('data-status') || '';
            applyFilters();
        }));

        // Search
        $('q').addEventListener('input', (e) => {
            state.q = e.target.value || '';
            applyFilters();
        });

        // Card actions (event delegation)
        ordersEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const card = e.target.closest('.order-card');
            const id = Number(card?.getAttribute('data-id'));
            const act = btn.getAttribute('data-act');
            if (!id || !act) return;

            if (act === 'details') {
                const details = card.querySelector('.order-details');
                details.hidden = !details.hidden;
                btn.textContent = details.hidden ? 'Details' : 'Hide details';
            }

            if (act === 'reorder') {
                const order = state.all.find(o => o.id === id);
                if (!order) return;
                for (const it of order.items) {
                    // build minimal product object for Cart.add
                    Cart.add({
                        id: it.product_id,
                        title: it.title,
                        price: it.unit_price,
                        image_url: it.image_url
                    }, it.quantity);
                }
                alert('Items added to your cart.');
                location.href = '/cart.html';
            }

            if (act === 'cancel') {
                if (!confirm('Cancel this order? Items will be restocked.')) return;
                btn.disabled = true;
                try {
                    await API.post(`/api/orders/${id}/cancel`, {}, true);
                    // update state & UI
                    const o = state.all.find(x => x.id === id);
                    if (o) o.status = 'CANCELLED';
                    applyFilters();
                } catch (err) {
                    alert(err?.message || 'Cancel failed');
                } finally {
                    btn.disabled = false;
                }
            }
        });
    });
})();
