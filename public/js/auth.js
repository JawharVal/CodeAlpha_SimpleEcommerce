(function () {
    const $ = (id) => document.getElementById(id);
    API.refreshNav();

    const msg = $('authMsg');
    const next = new URLSearchParams(location.search).get('next') || '';
    const topMsg = $('topMsg');
    if (next) topMsg.textContent = 'Please log in to continue.';

    // helpers
    const emailOK = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').toLowerCase());
    const setMsg  = (t, ok=false) => { msg.textContent = t; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
    const clearErr = (...ids) => ids.forEach(id => { const el=$(id); if (el) el.textContent=''; });

    // show/hide password
    const togglePw = (inputId, btnId) => {
        const input=$(inputId), btn=$(btnId);
        btn.addEventListener('click', ()=>{
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
        });
    };
    togglePw('loginPassword', 'toggleLoginPw');
    togglePw('regPassword', 'toggleRegPw');

    // ENTER to submit
    $('loginCard').addEventListener('keydown', (e)=>{ if(e.key==='Enter') $('loginBtn').click(); });
    $('registerCard').addEventListener('keydown', (e)=>{ if(e.key==='Enter') $('regBtn').click(); });
    $('goRegister').addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('registerCard').scrollIntoView({behavior:'smooth'}); });

    async function doLogin(email, password) {
        clearErr('loginEmailErr','loginPasswordErr');
        if (!emailOK(email)) { $('loginEmailErr').textContent='Enter a valid email'; return; }
        if (!password || password.length < 1) { $('loginPasswordErr').textContent='Enter your password'; return; }
        $('loginBtn').disabled = true; setMsg('Signing in…', true);
        try {
            const { token, user } = await API.post('/api/auth/login', { email, password });
            API.setAuth({ token, user });
            setMsg(`Welcome back, ${user.name}!`, true);
            setTimeout(()=>location.href = next || '/', 600);
        } catch (e) {
            setMsg(e.message || 'Login failed');
        } finally {
            $('loginBtn').disabled = false;
        }
    }

    async function doRegister(payload) {
        clearErr('regNameErr','regEmailErr','regPasswordErr');
        if (!payload.name) { $('regNameErr').textContent='Enter your name'; return; }
        if (!emailOK(payload.email)) { $('regEmailErr').textContent='Enter a valid email'; return; }
        if (!payload.password || payload.password.length < 6) { $('regPasswordErr').textContent='Minimum 6 characters'; return; }

        $('regBtn').disabled = true; setMsg('Creating account…', true);
        try {
            const { token, user } = await API.post('/api/auth/register', payload);
            API.setAuth({ token, user });
            setMsg(`Account created. Hello, ${user.name}!`, true);
            setTimeout(()=>location.href = next || '/profile.html', 700);
        } catch (e) {
            setMsg(e.message || 'Registration failed');
        } finally {
            $('regBtn').disabled = false;
        }
    }

    // wire buttons
    $('loginBtn').onclick = () => doLogin($('loginEmail').value.trim(), $('loginPassword').value);

    $('regBtn').onclick = () => doRegister({
        name: $('regName').value.trim(),
        email: $('regEmail').value.trim().toLowerCase(),
        password: $('regPassword').value,
        shipping_name: $('regShipName').value.trim() || null,
        shipping_address: $('regShipAddress').value.trim() || null,
        shipping_city: $('regShipCity').value.trim() || null,
        shipping_zip: $('regShipZip').value.trim() || null,
        shipping_country: $('regShipCountry').value.trim() || null
    });
})();
