/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   members.js — Equipe completa
   ============================================================ */

const MEMBERS = (() => {

  let editingMemberId = null;
  const CLASSES = ['Assault', 'DMR', 'Sniper', 'Suporte'];

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function init() {
    safeOn('btn-join',                   'click', openJoinForm);
    safeOn('modal-close-join',           'click', () => closeModal('modal-join'));
    safeOn('btn-cancel-join',            'click', () => closeModal('modal-join'));
    safeOn('btn-save-join',              'click', submitJoin);
    safeOn('modal-close-edit-member',    'click', () => closeModal('modal-edit-member'));
    safeOn('btn-cancel-edit-member',     'click', () => closeModal('modal-edit-member'));
    safeOn('btn-save-edit-member',       'click', saveEditMember);
    safeOn('modal-close-member-profile', 'click', () => closeModal('modal-member-profile'));

    safeOn('modal-join',          'click', function(e) { if (e.target === this) closeModal('modal-join'); });
    safeOn('modal-edit-member',   'click', function(e) { if (e.target === this) closeModal('modal-edit-member'); });
    safeOn('modal-member-profile','click', function(e) { if (e.target === this) closeModal('modal-member-profile'); });

    safeOn('edit-member-photo', 'change', function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const el = document.getElementById('edit-member-photo-preview');
        if (el) el.innerHTML = `<img src="${e.target.result}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);margin-top:8px;" />`;
      };
      reader.readAsDataURL(file);
    });

    // Upload foto própria via data-action
    document.addEventListener('click', function(e) {
      if (e.target && e.target.dataset.action === 'upload-self-photo') {
        uploadSelfPhoto(parseInt(e.target.dataset.id));
      }

      // Seletor de classe — formulário de entrada
      if (e.target && e.target.classList.contains('class-btn')) {
        document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const hidden = document.getElementById('join-role-hidden');
        if (hidden) hidden.value = e.target.dataset.class;
      }

      // Seletor de classe — formulário de editar
      if (e.target && e.target.classList.contains('class-btn-edit')) {
        document.querySelectorAll('.class-btn-edit').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const hidden = document.getElementById('edit-member-role-hidden');
        if (hidden) hidden.value = e.target.dataset.class;
      }
    });
  }

  /* ---- RENDER ---- */
  async function render() {
    const grid = document.getElementById('members-grid');
    if (grid) grid.innerHTML = '<div class="empty-state">Carregando...</div>';
    try { members = await DB.get('members', 'order=created_at.asc'); } catch(e) { console.error(e); }
    _renderAll();
  }

  function renderFromMemory() { _renderAll(); }

  function _renderAll() {
    renderPendingBanner();
    renderActiveMembers();
    const count = members.filter(m => m.status === 'active').length;
    const el = document.getElementById('stat-members');
    if (el) el.textContent = count;
  }

  /* ---- PENDENTES ---- */
  function renderPendingBanner() {
    const banner  = document.getElementById('pending-banner');
    const list    = document.getElementById('pending-list');
    if (!banner || !list) return;

    const pending = members.filter(m => m.status === 'pending');
    if (!AUTH.isAdmin() || pending.length === 0) { banner.style.display = 'none'; return; }

    banner.style.display = 'block';
    list.innerHTML = '';

    pending.forEach(p => {
      const item = document.createElement('div');
      item.className = 'pending-item';

      const info = document.createElement('div');
      info.className = 'pending-info';
      info.innerHTML = `<span class="pending-name">${p.name}</span><span class="pending-role">${p.role}</span>`;

      const actions = document.createElement('div');
      actions.className = 'pending-actions';

      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn-approve';
      approveBtn.textContent = '✓ Aprovar';
      approveBtn.addEventListener('click', () => approveMember(p.id));

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn-reject';
      rejectBtn.textContent = '✕ Recusar';
      rejectBtn.addEventListener('click', () => rejectMember(p.id));

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  /* ---- MEMBROS ATIVOS ---- */
  function renderActiveMembers() {
    const grid = document.getElementById('members-grid');
    if (!grid) return;
    const active = members.filter(m => m.status === 'active');
    grid.innerHTML = '';

    if (active.length === 0) {
      grid.innerHTML = '<div class="empty-state">Nenhum membro ativo ainda.</div>';
      return;
    }

    active.forEach(m => {
      const parts    = m.name.trim().split(' ');
      const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2)).toUpperCase();

      const card = document.createElement('div');
      card.className = 'member-card';

      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'member-avatar';
      if (m.photo_url) {
        avatar.style.cssText = 'padding:0;overflow:hidden;';
        avatar.innerHTML = `<img src="${m.photo_url}" style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        avatar.textContent = initials;
      }
      card.appendChild(avatar);

      // Nome e classe
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = m.name;
      card.appendChild(name);

      const role = document.createElement('div');
      role.className = 'role';
      role.textContent = m.role;
      card.appendChild(role);

      // Botões admin
      if (AUTH.isAdmin()) {
        const adminDiv = document.createElement('div');
        adminDiv.className = 'member-admin-btns';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-member-edit';
        editBtn.textContent = '✎';
        editBtn.addEventListener('click', e => { e.stopPropagation(); openEditMember(m.id); });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-member-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', e => { e.stopPropagation(); removeMember(m.id); });

        adminDiv.appendChild(editBtn);
        adminDiv.appendChild(removeBtn);
        card.appendChild(adminDiv);
      }

      // Clique no card abre perfil
      card.addEventListener('click', () => openProfile(m));
      grid.appendChild(card);
    });
  }

  /* ---- PERFIL ---- */
  function openProfile(m) {
    const parts    = m.name.trim().split(' ');
    const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2)).toUpperCase();

    const wrap = document.getElementById('profile-avatar-wrap');
    if (wrap) {
      wrap.innerHTML = m.photo_url
        ? `<img src="${m.photo_url}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--gold);filter:drop-shadow(0 0 12px rgba(200,168,75,0.4));" />`
        : `<div class="member-avatar" style="width:120px;height:120px;font-size:40px;margin:0 auto;">${initials}</div>`;
    }

    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    if (nameEl) nameEl.textContent = m.name;
    if (roleEl) roleEl.textContent = m.role;

    const uploadWrap = document.getElementById('profile-upload-wrap');
    if (uploadWrap) {
      uploadWrap.innerHTML = `
        <div style="margin-top:16px;">
          <label style="font-size:12px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px;">É você? Adicione sua foto:</label>
          <input type="file" id="self-photo-file" accept="image/*" style="color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:6px;width:100%;font-size:12px;" />
          <div id="self-photo-preview" style="margin-top:8px;"></div>
          <button data-action="upload-self-photo" data-id="${m.id}" class="btn-gold" style="width:100%;margin-top:10px;">Salvar Foto</button>
        </div>`;

      setTimeout(() => {
        const inp = document.getElementById('self-photo-file');
        if (inp) inp.addEventListener('change', function() {
          const file = this.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = e => {
            const prev = document.getElementById('self-photo-preview');
            if (prev) prev.innerHTML = `<img src="${e.target.result}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);" />`;
          };
          reader.readAsDataURL(file);
        });
      }, 50);
    }

    document.getElementById('modal-member-profile').classList.add('open');
  }

  /* ---- UPLOAD FOTO PRÓPRIA ---- */
  async function uploadSelfPhoto(memberId) {
    const fileInput = document.getElementById('self-photo-file');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) { alert('Selecione uma foto primeiro.'); return; }

    const btn = document.querySelector('[data-action="upload-self-photo"]');
    if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }

    try {
      const ext      = file.name.split('.').pop();
      const fileName = `member_${memberId}_${Date.now()}.${ext}`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${fileName}`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file
      });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());

      const photo_url = `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
      await DB.patch('members', memberId, { photo_url });

      const m = members.find(x => x.id === memberId);
      if (m) m.photo_url = photo_url;

      closeModal('modal-member-profile');
      _renderAll();
      showToast('Foto atualizada! 💀');
    } catch(e) {
      alert('Erro ao enviar foto: ' + e.message);
      if (btn) { btn.textContent = 'Salvar Foto'; btn.disabled = false; }
    }
  }

  /* ---- CADASTRO ---- */
  function openJoinForm() {
    // Reset classe selecionada
    document.querySelectorAll('.class-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    const hidden = document.getElementById('join-role-hidden');
    if (hidden) hidden.value = 'Assault';
    const nameInput = document.getElementById('join-name');
    if (nameInput) nameInput.value = '';
    document.getElementById('modal-join').classList.add('open');
    if (nameInput) nameInput.focus();
  }

  async function submitJoin() {
    const nameInput = document.getElementById('join-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const hiddenRole = document.getElementById('join-role-hidden');
    const role = hiddenRole ? hiddenRole.value : 'Assault';
    if (!name) { alert('Preencha seu nome completo.'); return; }

    try {
      const result = await DB.post('members', { name, role, status: 'pending' });
      if (result && result[0]) members.push(result[0]);
      closeModal('modal-join');
      if (nameInput) nameInput.value = '';
      showToast('Solicitação enviada! Aguarde aprovação. 🪖');
    } catch(e) { alert('Erro ao enviar: ' + e.message); console.error(e); }
  }

  /* ---- APROVAR / RECUSAR ---- */
  async function approveMember(id) {
    try {
      await DB.patch('members', id, { status: 'active' });
      const m = members.find(x => x.id === id);
      if (m) m.status = 'active';
      _renderAll();
      showToast('Operador aprovado! ✓');
    } catch(e) { alert('Erro ao aprovar.'); }
  }

  async function rejectMember(id) {
    const m = members.find(x => x.id === id);
    if (!confirm('Recusar ' + (m ? m.name : 'este operador') + '?')) return;
    try {
      await DB.delete('members', id);
      const idx = members.findIndex(x => x.id === id);
      if (idx !== -1) members.splice(idx, 1);
      _renderAll();
      showToast('Solicitação recusada.');
    } catch(e) { alert('Erro ao recusar.'); }
  }

  /* ---- EDITAR MEMBRO (admin) ---- */
  function openEditMember(id) {
    if (!AUTH.isAdmin()) return;
    const m = members.find(x => x.id === id);
    if (!m) return;
    editingMemberId = id;

    const nameEl = document.getElementById('edit-member-name');
    if (nameEl) nameEl.value = m.name;

    const hiddenRole = document.getElementById('edit-member-role-hidden');
    if (hiddenRole) hiddenRole.value = m.role;

    document.querySelectorAll('.class-btn-edit').forEach(b => {
      b.classList.toggle('active', b.dataset.class === m.role);
    });

    const preview = document.getElementById('edit-member-photo-preview');
    if (preview) preview.innerHTML = m.photo_url
      ? `<img src="${m.photo_url}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);margin-top:8px;" />`
      : '';

    document.getElementById('modal-edit-member').classList.add('open');
  }

  async function saveEditMember() {
    const nameEl    = document.getElementById('edit-member-name');
    const hiddenRole = document.getElementById('edit-member-role-hidden');
    const photoFile = document.getElementById('edit-member-photo');

    const name = nameEl ? nameEl.value.trim() : '';
    const role = hiddenRole ? hiddenRole.value.trim() : '';
    const file = photoFile ? photoFile.files[0] : null;

    if (!name) { alert('Preencha o nome.'); return; }

    const btn = document.getElementById('btn-save-edit-member');
    if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

    try {
      let photo_url = members.find(x => x.id === editingMemberId)?.photo_url || null;

      if (file) {
        const ext      = file.name.split('.').pop();
        const fileName = `member_${editingMemberId}_${Date.now()}.${ext}`;
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${fileName}`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': file.type, 'x-upsert': 'true' },
          body: file
        });
        if (!uploadRes.ok) throw new Error(await uploadRes.text());
        photo_url = `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
      }

      await DB.patch('members', editingMemberId, { name, role, photo_url });
      const m = members.find(x => x.id === editingMemberId);
      if (m) Object.assign(m, { name, role, photo_url });

      closeModal('modal-edit-member');
      _renderAll();
      showToast('Membro atualizado! ✓');
    } catch(e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      if (btn) { btn.textContent = 'Salvar'; btn.disabled = false; }
    }
  }

  /* ---- REMOVER ---- */
  async function removeMember(id) {
    const m = members.find(x => x.id === id);
    if (!confirm('Remover ' + (m ? m.name : 'este membro') + '?')) return;
    try {
      await DB.delete('members', id);
      const idx = members.findIndex(x => x.id === id);
      if (idx !== -1) members.splice(idx, 1);
      _renderAll();
      showToast((m ? m.name : 'Membro') + ' removido.');
    } catch(e) { alert('Erro ao remover.'); }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  return { init, render, renderFromMemory };

})();
