// public/js/product.js
(function () {
    const $ = (id) => document.getElementById(id);

    async function init() {
        API.refreshNav();

        const wrap = $('prod');
        const params = new URLSearchParams(location.search);
        const id = Number(params.get('id') || 0);

        if (!id) {
            wrap.textContent = 'Invalid product id.';
            wrap.style.color = 'red';
            return;
        }

        try {
            const p = await API.get('/api/products/' + id);

            wrap.innerHTML = `
         <img src="${p.image_url}" alt="${p.title}" onerror="this.onerror=null;this.src='/img/fallback.svg'" style="width:100%;height:260px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>
        <h2 style="margin:8px 0">${p.title}</h2>
        <div class="muted" style="margin-bottom:6px">${p.category || ''}</div>
        <p>${p.description || ''}</p>
        <div class="row" style="margin:10px 0">
          <strong>$${p.price.toFixed(2)}</strong>
          <span class="muted"> • In stock: ${p.stock}</span>
        </div>
        <div class="row" style="gap:8px">
          <input id="qty" type="number" min="1" value="1" style="width:100px"/>
          <button id="addBtn">Add to cart</button>
        </div>
        <p id="msg" class="muted"></p>
      `;

            const qtyEl = $('qty');
            const msg = $('msg');
            $('addBtn').onclick = () => {
                const qty = Math.max(1, Number(qtyEl.value || 1));
                Cart.add(p, qty);
                msg.textContent = `Added ${qty} to cart ✅`;
                setTimeout(() => (msg.textContent = ''), 1200);
            };
        } catch (e) {
            wrap.textContent = (e?.message || 'Failed to load product');
            wrap.style.color = 'red';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
