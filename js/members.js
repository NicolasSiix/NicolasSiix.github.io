/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   members.js — Equipe com foto de perfil, Supabase Storage
   ============================================================ */

const MEMBERS = (() => {

  let editingMemberId = null;

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function init() {
    safeOn('btn-join',              'click', openJoinForm);
    safeOn('modal-close-join',      'click', () => closeModal('modal-join'));
    safeOn('btn-cancel-join',       'click', () => closeModal('modal-join'));
    safeOn('btn-save-join',         'click', submitJoin);
    safeOn('modal-close-edit-member','click',() => closeModal('modal-edit-member'));
    safeOn('btn-cancel-edit-member','click', () => closeModal('modal-edit-member'));
    safeOn('btn-save-edit-member',  'click', saveEditMember);
    safeOn('modal-close-member-profile','click', () => closeModal('modal-member-profile'));

    safeOn('modal-join',         'click', function(e) { if (e.target === this) closeModal('modal-join'); });
    safeOn('modal-edit-member',  'click', function(e) { if (e.target === this) closeModal('modal-edit-member'); });
    safeOn('modal-member-profile','click',function(e) { if (e.target === this) closeModal('modal-member-profile'); });

    // Preview da foto ao editar membro
    safeOn('edit-member-photo', 'change', function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('edit-member-photo-preview').innerHTML =
          `<img src="${e.target.result}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);" />`;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---- RENDER PRINCIPAL ---- */
  async function render() {
    document.getElementById('members-grid').innerHTML =
      '<div class="empty-state">Carregando operadores...</div>';
    try {
      members = await DB.get('members', 'order=created_at.asc');
    } catch(e) { console.error(e); }
    _renderAll();
  }

  function renderFromMemory() { _renderAll(); }

  function _renderAll() {
    renderPendingBanner();
    renderActiveMembers();
    document.getElementById('stat-members').textContent =
      members.filter(m => m.status === 'active').length;
  }

  /* ---- BANNER PENDENTES ---- */
  function renderPendingBanner() {
    const banner  = document.getElementById('pending-banner');
    const list    = document.getElementById('pending-list');
    const pending = members.filter(m => m.status === 'pending');

    if (!AUTH.isAdmin() || pending.length === 0) { banner.style.display = 'none'; return; }

    banner.style.display = 'block';
    list.innerHTML = '';

    pending.forEach(p => {
      const item = document.createElement('div');
      item.className = 'pending-item';
      item.innerHTML = `
        <div class="pending-info">
          <span class="pending-name">${p.name}</span>
          <span class="pending-role">${p.role}</span>
        </div>
        <div class="pending-actions">
          <button class="btn-approve" onclick="MEMBERS.approveMember(${p.id})">✓ Aprovar</button>
          <button class="btn-reject"  onclick="MEMBERS.rejectMember(${p.id})">✕ Recusar</button>
        </div>`;
      list.appendChild(item);
    });
  }

  /* ---- MEMBROS ATIVOS ---- */
  function renderActiveMembers() {
    const grid   = document.getElementById('members-grid');
    const active = members.filter(m => m.status === 'active');
    grid.innerHTML = '';

    if (active.length === 0) {
      grid.innerHTML = '<div class="empty-state">Nenhum membro ativo ainda.</div>';
      return;
    }

    active.forEach(m => {
      const parts    = m.name.trim().split(' ');
      const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].substring(0,2)).toUpperCase();

      const avatarHtml = m.photo_url
        ? `<div class="member-avatar" style="padding:0;overflow:hidden;"><img src="${m.photo_url}" style="width:100%;height:100%;object-fit:cover;" /></div>`
        : `<div class="member-avatar">${initials}</div>`;

      const adminControls = AUTH.isAdmin() ? `
        <div class="member-admin-btns">
          <button class="btn-member-edit"   onclick="event.stopPropagation();MEMBERS.openEditMember(${m.id})">✎</button>
          <button class="btn-member-remove" onclick="event.stopPropagation();MEMBERS.removeMember(${m.id})">✕</button>
        </div>` : '';

      const card = document.createElement('div');
      card.className = 'member-card';
      card.innerHTML = `
        ${avatarHtml}
        <div class="name">${m.name}</div>
        <div class="role">${m.role}</div>
        ${adminControls}`;

      card.addEventListener('click', () => openProfile(m));
      grid.appendChild(card);
    });
  }

  /* ---- MODAL PERFIL ---- */
  function openProfile(m) {
    const parts    = m.name.trim().split(' ');
    const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].substring(0,2)).toUpperCase();

    const wrap = document.getElementById('profile-avatar-wrap');
    wrap.innerHTML = m.photo_url
      ? `<img src="${m.photo_url}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--gold);filter:drop-shadow(0 0 12px rgba(200,168,75,0.4));" />`
      : `<div class="member-avatar" style="width:120px;height:120px;font-size:40px;margin:0 auto;">${initials}</div>`;

    document.getElementById('profile-name').textContent = m.name;
    document.getElementById('profile-role').textContent = m.role;

    // Botão de upload de foto para o próprio operador
    const uploadWrap = document.getElementById('profile-upload-wrap');
    if (uploadWrap) {
      uploadWrap.innerHTML = `
        <div style="margin-top:16px;">
          <label style="font-size:12px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px;">
            É você? Adicione sua foto:
          </label>
          <input type="file" id="self-photo-file" accept="image/*"
            style="color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:6px;width:100%;font-size:12px;" />
          <div id="self-photo-preview" style="margin-top:8px;"></div>
          <button onclick="MEMBERS.uploadSelfPhoto(${m.id})" class="btn-gold" style="width:100%;margin-top:10px;">
            Salvar Foto
          </button>
        </div>`;

      // Preview
      setTimeout(() => {
        const inp = document.getElementById('self-photo-file');
        if (inp) inp.addEventListener('change', function() {
          const file = this.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = e => {
            document.getElementById('self-photo-preview').innerHTML =
              `<img src="${e.target.result}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);" />`;
          };
          reader.readAsDataURL(file);
        });
      }, 100);
    }

    document.getElementById('modal-member-profile').classList.add('open');
  }

  async function uploadSelfPhoto(memberId) {
    const fileInput = document.getElementById('self-photo-file');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) { alert('Selecione uma foto primeiro.'); return; }

    const btn = document.querySelector('#profile-upload-wrap .btn-gold');
    if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }

    try {
      const ext      = file.name.split('.').pop();
      const fileName = `member_${memberId}_${Date.now()}.${ext}`;

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/photos/${fileName}`,
        {
          method: 'POST',
          headers: {
            'apikey':        SUPABASE_ANON,
            'Authorization': 'Bearer ' + SUPABASE_ANON,
            'Content-Type':  file.type,
            'x-upsert':      'true'
          },
          body: file
        }
      );

      if (!uploadRes.ok) throw new Error(await uploadRes.text());

      const photo_url = `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
      await DB.patch('members', memberId, { photo_url });

      const m = members.find(x => x.id === memberId);
      if (m) m.photo_url = photo_url;

      closeModal('modal-member-profile');
      _renderAll();
      showToast('Foto atualizada! 💀');

    } catch(e) {
      alert('Erro ao enviar foto.');
      console.error(e);
      if (btn) { btn.textContent = 'Salvar Foto'; btn.disabled = false; }
    }
  }

  /* ---- CADASTRO ---- */
  function openJoinForm() {
    document.getElementById('modal-join').classList.add('open');
    document.getElementById('join-name').focus();
  }

  async function submitJoin() {
    const name = document.getElementById('join-name').value.trim();
    const role = document.getElementById('join-role').value;
    if (!name) { alert('Preencha seu nome completo.'); return; }
    try {
      const result = await DB.post('members', { name, role, status: 'pending' });
      members.push(result[0]);
      closeModal('modal-join');
      document.getElementById('join-name').value = '';
      showToast('Solicitação enviada! Aguarde aprovação. 🪖');
    } catch(e) { alert('Erro ao enviar.'); console.error(e); }
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
      members.splice(members.findIndex(x => x.id === id), 1);
      _renderAll();
      showToast('Solicitação recusada.');
    } catch(e) { alert('Erro ao recusar.'); }
  }

  /* ---- EDITAR MEMBRO ---- */
  function openEditMember(id) {
    if (!AUTH.isAdmin()) return;
    const m = members.find(x => x.id === id);
    if (!m) return;
    editingMemberId = id;
    document.getElementById('edit-member-name').value  = m.name;
    document.getElementById('edit-member-role').value  = m.role;
    document.getElementById('edit-member-photo-preview').innerHTML = m.photo_url
      ? `<img src="${m.photo_url}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);" />`
      : '';
    document.getElementById('modal-edit-member').classList.add('open');
  }

  async function saveEditMember() {
    const name      = document.getElementById('edit-member-name').value.trim();
    const role      = document.getElementById('edit-member-role').value.trim();
    const photoFile = document.getElementById('edit-member-photo').files[0];
    if (!name) { alert('Preencha o nome.'); return; }

    const btn = document.getElementById('btn-save-edit-member');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      let photo_url = members.find(x => x.id === editingMemberId)?.photo_url || null;

      if (photoFile) {
        const ext      = photoFile.name.split('.').pop();
        const fileName = `member_${editingMemberId}_${Date.now()}.${ext}`;
        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/photos/${fileName}`,
          {
            method: 'POST',
            headers: {
              'apikey':        SUPABASE_ANON,
              'Authorization': 'Bearer ' + SUPABASE_ANON,
              'Content-Type':  photoFile.type,
              'x-upsert':      'true'
            },
            body: photoFile
          }
        );
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
      alert('Erro ao salvar.');
      console.error(e);
    } finally {
      btn.textContent = 'Salvar';
      btn.disabled = false;
    }
  }

  /* ---- REMOVER ---- */
  async function removeMember(id) {
    const m = members.find(x => x.id === id);
    if (!confirm('Remover ' + (m ? m.name : 'este membro') + '?')) return;
    try {
      await DB.delete('members', id);
      members.splice(members.findIndex(x => x.id === id), 1);
      _renderAll();
      showToast((m ? m.name : 'Membro') + ' removido.');
    } catch(e) { alert('Erro ao remover.'); }
  }

  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  return { init, render, renderFromMemory, approveMember, rejectMember, openEditMember, removeMember };

})();
