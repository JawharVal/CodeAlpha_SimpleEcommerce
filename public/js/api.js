console.log('[api] loaded');
const API = {
    base: '',
    token() { return localStorage.getItem('token') || ''; },
    user() { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } },
    setAuth({ token, user }) {
        if (token) localStorage.setItem('token', token);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        Cart.migrateGuestToUser();   // <- merge guest cart into logged-in user's cart
        this.refreshNav();
    },
    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.refreshNav();
    },

    async get(path, auth=false) {
        const res = await fetch(`${this.base}${path}`, {
            headers: auth ? { 'Authorization': `Bearer ${this.token()}` } : {}
        });
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
        if (!res.ok) throw new Error(data?.message || res.statusText);
        return data;
    },

    async post(path, body, auth=false) {
        const res = await fetch(`${this.base}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(auth ? { 'Authorization': `Bearer ${this.token()}` } : {}) },
            body: JSON.stringify(body || {})
        });
        const text = await res.text();
        let data; try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
        if (!res.ok) throw new Error(data?.message || res.statusText);
        return data;
    },
    async put(path, body, auth=false) {
        const res = await fetch(`${this.base}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(auth ? { 'Authorization': `Bearer ${this.token()}` } : {}) },
            body: JSON.stringify(body || {})
        });
        const text = await res.text();
        let data; try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
        if (!res.ok) throw new Error(data?.message || res.statusText);
        return data;
    },

    refreshNav() {
        const link = document.getElementById('loginLink');
        const logout = document.getElementById('logoutLink');
        const u = this.user();  // Get user data from localStorage

        if (u) {
            if (link) {
                link.textContent = u.name || 'Profile';
                link.href = '/profile.html';
            }
            if (logout) {
                logout.style.display = '';
                logout.onclick = (e) => {
                    e.preventDefault();
                    this.clearAuth();  // Log out user
                    location.href = '/';  // Redirect to home
                };
            }
        } else {
            if (link) {
                link.textContent = 'Login';
                link.href = '/login.html';
            }
            if (logout) {
                logout.style.display = 'none';
                logout.onclick = null;
            }
        }
    }

};

const Cart = {
    key() {
        const u = API.user();
        return u ? `cart_${u.id}` : 'cart_guest';
    },
    load() { return JSON.parse(localStorage.getItem(this.key()) || '[]'); },
    save(items) { localStorage.setItem(this.key(), JSON.stringify(items)); },
    add(product, qty = 1) {
        const items = this.load();
        const idx = items.findIndex(i => i.id === product.id);
        if (idx >= 0) {
            items[idx].qty += qty;
        } else {
            items.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image_url: product.image_url || '/img/fallback.svg', // <-- keep image
                qty
            });
        }
        this.save(items);
    },
    setQty(id, qty) {
        const items = this.load();
        const i = items.findIndex(x => x.id === id);
        if (i >= 0) {
            items[i].qty = Math.max(1, qty|0);
            this.save(items);
        }
    },
    remove(id) { this.save(this.load().filter(i => i.id !== id)); },
    clear() { this.save([]); },
    total() { return this.load().reduce((s, i) => s + i.price * i.qty, 0); },
    migrateGuestToUser() {
        const u = API.user();
        if (!u) return;
        const guestKey = 'cart_guest';
        const guest = JSON.parse(localStorage.getItem(guestKey) || '[]');
        if (!guest.length) return;
        const mine = this.load();
        for (const g of guest) {
            const idx = mine.findIndex(i => i.id === g.id);
            if (idx >= 0) mine[idx].qty += g.qty; else mine.push(g);
        }
        localStorage.setItem(this.key(), JSON.stringify(mine));
        localStorage.removeItem(guestKey);
    }
};


// auto-update nav on every page that includes api.js
document.addEventListener('DOMContentLoaded', () => {
    API.refreshNav();
    MiniCart.init();
});
window.API = API;
window.Cart = Cart; // optional, if used elsewhere
function _esc(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

const MiniCart = {
    el: null, toggleBtn: null, badge: null,
    init() {
        const boot = () => this._init();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    },
    _init() {
        this.toggleBtn = document.getElementById('cartToggle') || document.querySelector('a[href="/cart.html"]');
        this.badge = document.getElementById('cartBadge');

        // create container if missing
        this.el = document.getElementById('miniCart');
        if (!this.el) {
            this.el = document.createElement('div');
            this.el.id = 'miniCart';
            this.el.className = 'mini-cart';
            document.body.appendChild(this.el);
        }

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }

        // outside click / escape to close
        document.addEventListener('click', (e) => {
            if (!this.el.contains(e.target) && !this.toggleBtn?.contains(e.target)) this.hide();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });

        // initial render
        this.render();
    },
    position() {
        if (!this.toggleBtn) return;
        const rect = this.toggleBtn.getBoundingClientRect();
        this.el.style.top = (rect.bottom + 8) + 'px';
        this.el.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        this.el.style.width = '360px';
    },
    render() {
        const items = Cart.load();
        const count = items.reduce((s,i)=>s+i.qty, 0);
        if (this.badge) this.badge.textContent = count ? String(count) : '';

        if (!items.length) {
            this.el.innerHTML = `<div class="mini-cart-empty">Your cart is empty.</div>`;
            return;
        }

        this.el.innerHTML = `
      <div class="mini-cart-list">
        ${items.map(i => `
          <div class="mini-cart-item" data-id="${i.id}">
            <img src="${i.image_url || '/img/placeholder.png'}" alt="">
            <div class="mc-title">
              <div class="title">${_esc(i.title)}</div>
              <div class="price">$${i.price.toFixed(2)}</div>
            </div>
            <div class="mc-qty">
              <button class="dec" aria-label="Decrease">−</button>
              <span class="qty">${i.qty}</span>
              <button class="inc" aria-label="Increase">+</button>
            </div>
            <div class="mc-sub">$${(i.qty * i.price).toFixed(2)}</div>
            <button class="remove" title="Remove">×</button>
          </div>
        `).join('')}
      </div>
      <div class="mini-cart-footer">
        <div class="mc-total"><span>Total</span><strong>$${Cart.total().toFixed(2)}</strong></div>
        <div class="mc-actions">
          <a class="btn btn-secondary" href="/cart.html">View cart</a>
          <button class="btn primary" id="mcCheckout">Checkout</button>
        </div>
      </div>
    `;

        // delegate actions
        this.el.onclick = (e) => {
            if (e.target.id === 'mcCheckout') {
                this.checkout(); return;
            }
            const row = e.target.closest('.mini-cart-item');
            if (!row) return;
            const id = Number(row.dataset.id);

            if (e.target.classList.contains('inc')) {
                const current = Cart.load().find(x => x.id === id);
                if (current) Cart.add(current, 1);
                this.render();
            } else if (e.target.classList.contains('dec')) {
                const arr = Cart.load();
                const idx = arr.findIndex(x => x.id === id);
                if (idx >= 0) {
                    arr[idx].qty = Math.max(0, arr[idx].qty - 1);
                    if (arr[idx].qty === 0) arr.splice(idx, 1);
                    Cart.save(arr);
                }
                this.render();
            } else if (e.target.classList.contains('remove')) {
                Cart.remove(id);
                this.render();
            }
        };
    },
    toggle(){ this.position(); this.el.classList.toggle('show'); this.render(); },
    show(){ this.position(); this.el.classList.add('show'); this.render(); },
    hide(){ this.el.classList.remove('show'); },
    checkout(){
        if (!API.user()) {
            location.href = '/login.html?next=' + encodeURIComponent('/checkout.html');
            return;
        }
        location.href = '/checkout.html';
    }
};

