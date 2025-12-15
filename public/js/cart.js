// public/js/cart.js
(function () {
    const $ = id => document.getElementById(id);

    async function rehydrate(items) {
        // For old items that lack image_url/title/price, fetch product and fix them
        let changed = false;
        const need = items.filter(i => !i.image_url || !i.title || typeof i.price !== 'number');
        for (const it of need) {
            try {
                const p = await API.get('/api/products/' + it.id);
                it.title = it.title || p.title;
                it.price = (typeof it.price === 'number') ? it.price : p.price;
                it.image_url = it.image_url || p.image_url || '/img/fallback.svg';
                changed = true;
            } catch (_) {
                it.image_url = it.image_url || '/img/fallback.svg';
            }
        }
        if (changed) Cart.save(items);
        return items;
    }

    function render() {
        const list = $('cartList');
        const empty = $('emptyMsg');
        const totalEl = $('cartTotal');

        let items = Cart.load();
        if (!items.length) {
            list.innerHTML = '';
            empty.style.display = 'block';
            totalEl.textContent = '$0.00';
            $('checkoutBtn').disabled = true;
            return;
        }
        empty.style.display = 'none';

        list.innerHTML = items.map(i => `
      <div class="cart-row">
        <img class="cart-thumb" src="${i.image_url}" alt="${i.title}"
             onerror="this.onerror=null;this.src='/img/fallback.svg'">
        <div class="cart-info">
          <div class="cart-title">${i.title}</div>
          <div class="cart-price">$${i.price.toFixed(2)}</div>
        </div>
        <div class="cart-qty">
          <button data-act="dec" data-id="${i.id}">−</button>
          <input data-id="${i.id}" type="number" min="1" value="${i.qty}">
          <button data-act="inc" data-id="${i.id}">+</button>
        </div>
        <button class="cart-remove" data-act="rm" data-id="${i.id}">×</button>
      </div>
    `).join('');

        totalEl.textContent = '$' + Cart.total().toFixed(2);
        $('checkoutBtn').disabled = false;
    }

    async function init() {
        API.refreshNav();
        let items = Cart.load();
        items = await rehydrate(items); // ensure images exist
        render();

        $('cartList').addEventListener('click', (e) => {
            const id = Number(e.target.getAttribute('data-id'));
            const act = e.target.getAttribute('data-act');
            if (!id || !act) return;

            if (act === 'inc') {
                const items = Cart.load();
                const it = items.find(x => x.id === id);
                if (it) { it.qty += 1; Cart.save(items); render(); }
            } else if (act === 'dec') {
                const items = Cart.load();
                const it = items.find(x => x.id === id);
                if (it && it.qty > 1) { it.qty -= 1; Cart.save(items); render(); }
            } else if (act === 'rm') {
                Cart.remove(id); render();
            }
        });

        $('cartList').addEventListener('change', (e) => {
            if (e.target.tagName !== 'INPUT') return;
            const id = Number(e.target.getAttribute('data-id'));
            const qty = Math.max(1, Number(e.target.value || 1));
            Cart.setQty(id, qty);
            render();
        });

        $('checkoutBtn').onclick = () => location.href = '/checkout.html';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
