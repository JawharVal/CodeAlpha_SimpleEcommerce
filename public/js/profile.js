// public/js/profile.js
(function () {
    const $ = (id) => document.getElementById(id);
    const S = { original: null, dirty: false, avatarData: null };

    function enableSave() { $('save').disabled = !S.dirty; }
    function toast(text, ok=false) { const m=$('msg'); m.textContent=text; m.className='toast ' + (ok?'ok':'err'); }

    function waitForApi(maxMs=3000){
        return new Promise((res,rej)=>{
            const t0=Date.now(); const h=setInterval(()=>{ if(window.API){clearInterval(h);res();} else if(Date.now()-t0>maxMs){clearInterval(h);rej(new Error('API not loaded'));}},60);
        });
    }

    function bindDirty(...ids){
        ids.forEach(id=>{
            const el=$(id);
            if(!el) return;
            el.addEventListener('input', ()=>{ S.dirty = true; enableSave(); });
            el.addEventListener('change', ()=>{ S.dirty = true; enableSave(); });
        });
    }

    function readFileAsDataURL(file){
        return new Promise((resolve,reject)=>{
            const fr=new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror= reject;
            fr.readAsDataURL(file);
        });
    }

    async function init(){
        await waitForApi();
        API.refreshNav();

        const guard = $('guard');
        const wrap = $('profile');
        const avatar = $('avatar');

        if(!API.user()){ guard.textContent = 'Please log in.'; return; }

        try{
            guard.textContent = 'Loading profile…';
            const me   = await API.get('/api/me', true);
            const prof = await API.get('/api/me/profile', true);

            S.original = { me, prof };

            // Fill UI
            $('uName').textContent = me.name || '';
            $('uEmail').textContent = me.email || '';
            $('name').value = me.name || '';
            avatar.src = prof?.avatar_url || '/img/avatar_placeholder.svg';

            $('shipping_name').value    = prof?.shipping_name    || '';
            $('shipping_address').value = prof?.shipping_address || '';
            $('shipping_city').value    = prof?.shipping_city    || '';
            $('shipping_zip').value     = prof?.shipping_zip     || '';
            $('shipping_country').value = prof?.shipping_country || '';

            wrap.style.display = 'grid';
            guard.style.display = 'none';

            // Dirty tracking
            bindDirty('name','shipping_name','shipping_address','shipping_city','shipping_zip','shipping_country');

            // Avatar upload
            $('fileAvatar').addEventListener('change', async (e)=>{
                const f = e.target.files?.[0];
                if(!f) return;
                if (f.size > 2*1024*1024) { toast('Avatar too large (max 2MB)'); e.target.value=''; return; }
                const dataUrl = await readFileAsDataURL(f);
                S.avatarData = dataUrl;       // store to send on save
                avatar.src = dataUrl;         // preview
                S.dirty = true; enableSave();
                toast('', true);              // clear
            });

            // Reset
            $('reset').onclick = ()=>{
                $('name').value = S.original.me.name || '';
                avatar.src = S.original.prof?.avatar_url || '/img/avatar_placeholder.svg';
                $('fileAvatar').value='';
                $('shipping_name').value    = S.original.prof?.shipping_name    || '';
                $('shipping_address').value = S.original.prof?.shipping_address || '';
                $('shipping_city').value    = S.original.prof?.shipping_city    || '';
                $('shipping_zip').value     = S.original.prof?.shipping_zip     || '';
                $('shipping_country').value = S.original.prof?.shipping_country || '';
                S.avatarData = null; S.dirty = false; enableSave(); $('msg').textContent='';
            };

            // Save
            $('save').onclick = async ()=>{
                // minimal validation
                const required = ['shipping_name','shipping_address','shipping_city','shipping_zip','shipping_country'];
                for (const id of required) {
                    if (!$(id).value.trim()) { toast('Please fill all shipping fields'); return; }
                }
                $('save').disabled = true; toast('Saving…', true);

                try{
                    // Save shipping + avatar (and name)
                    await API.put('/api/me/profile', {
                        name: $('name').value.trim() || null,
                        shipping_name: $('shipping_name').value.trim(),
                        shipping_address: $('shipping_address').value.trim(),
                        shipping_city: $('shipping_city').value.trim(),
                        shipping_zip: $('shipping_zip').value.trim(),
                        shipping_country: $('shipping_country').value.trim(),
                        avatar_url: S.avatarData || avatar.src   // keep current if not changed
                    }, true);
                    const current = API.user() || {};
                    const newName = $('name').value.trim() || current.name || '';
                    API.setAuth({ token: API.token(), user: { ...current, name: newName } });
                    // Refresh header name + clear dirty
                    $('uName').textContent = $('name').value.trim() || S.original.me.name || '';
                    S.original = {
                        me: { ...S.original.me, name: $('name').value.trim() },
                        prof: {
                            ...S.original.prof,
                            shipping_name: $('shipping_name').value.trim(),
                            shipping_address: $('shipping_address').value.trim(),
                            shipping_city: $('shipping_city').value.trim(),
                            shipping_zip: $('shipping_zip').value.trim(),
                            shipping_country: $('shipping_country').value.trim(),
                            avatar_url: S.avatarData || avatar.src
                        }
                    };
                    S.avatarData = null; S.dirty = false; enableSave();
                    toast('Saved ✓', true);
                } catch(e){
                    toast(e.message || 'Save failed');
                } finally {
                    $('save').disabled = false;
                }
            };

            enableSave();
        }catch(e){
            console.error(e);
            $('guard').textContent = 'Failed to load profile';
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
