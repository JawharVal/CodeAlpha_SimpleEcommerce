let state = { q:'', category:'', sort:'new', page:1, pageSize:12 };

async function load() {
    const { q, category, sort, page, pageSize } = state;
    const params = new URLSearchParams({ q, category, sort, page, pageSize });
    const data = await API.get('/api/products?' + params.toString());

    const list = document.getElementById('products');
    list.innerHTML = data.items.map(p => `
      <div class="card">
        <img src="${p.image_url}" alt="${p.title}" onerror="this.onerror=null;this.src='/img/fallback.svg'"/>
        <h3>${p.title}</h3>
        <div class="muted">${p.category}</div>
        <p>$${p.price.toFixed(2)}</p>
        <div class="row">
          <a class="btn" href="/product.html?id=${p.id}">Details</a>
          <button data-id="${p.id}">Add</button>
        </div>
      </div>
    `).join('');

    list.onclick = async e => {
        if (e.target.tagName === 'BUTTON') {
            const id = Number(e.target.getAttribute('data-id'));
            const p = await API.get('/api/products/' + id);
            Cart.add(p, 1);
            e.target.textContent = 'Added';
            setTimeout(()=> e.target.textContent='Add', 900);
        }
    }

    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    document.getElementById('pageInfo').textContent = `Page ${data.page} / ${pages}`;
    document.getElementById('prev').disabled = data.page <= 1;
    document.getElementById('next').disabled = data.page >= pages;
}

document.getElementById('apply').onclick = () => {
    state.q = document.getElementById('q').value.trim();
    state.category = document.getElementById('category').value;
    state.sort = document.getElementById('sort').value;
    state.page = 1; load();
};
document.getElementById('prev').onclick = () => { state.page--; load(); }
document.getElementById('next').onclick = () => { state.page++; load(); }
load();
