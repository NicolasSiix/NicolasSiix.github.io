/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   members.js — Equipe com Supabase
   ============================================================ */

const MEMBERS = (() => {

  let editingMemberId = null;

  function init() {
    document.getElementById('btn-join').addEventListener('click', openJoinForm);
    document.getElementById('modal-close-join').addEventListener('click', () => closeModal('modal-join'));
    document.getElementById('modal-join').addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-join');
    });
    document.getElementById('btn-cancel-join').addEventListener('click', () => closeModal('modal-join'));
    document.getElementById('btn-save-join').addEventListener('click', submitJoin);

    document.getElementById('modal-close-edit-member').addEventListener('click', () => closeModal('modal-edit-member'));
    document.getElementById('modal-edit-member').addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-edit-member');
    });
    document.getElementById('btn-cancel-edit-member').addEventListener('click', () => closeModal('modal-edit-member'));
    document.getElementById('btn-save-edit-member').addEventListener('click', saveEditMember);
  }

  /* ---- RENDER COM FETCH DO BANCO ---- */
  async function render() {
    document.getElementById('members-grid').innerHTML =
      '<div class="empty-state">Carregando operadores...</div>';
    try {
      members = await DB.get('members', 'order=created_at.asc');
    } catch(e) {
      console.error('Erro ao carregar membros:', e);
    }
    _renderAll();
  }

  /* ---- RENDER COM DADOS JÁ EM MEMÓRIA (chamado pelo app.js no boot) ---- */
  function renderFromMemory() {
    _renderAll();
  }

  function _renderAll() {
    renderPendingBanner();
    renderActiveMembers();
    const activeCount = members.filter(m => m.status === 'active').length;
    document.getElementById('stat-members').textContent = activeCount;
  }

  /* ---- BANNER DE PENDENTES ---- */
  function renderPendingBanner() {
    const banner  = document.getElementById('pending-banner');
    const list    = document.getElementById('pending-list');
    const pending = members.filter(m => m.status === 'pending');

    if (!AUTH.isAdmin() || pending.length === 0) {
      banner.style.display = 'none';
      return;
    }

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
      const initials = (parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : parts[0].substring(0, 2)).toUpperCase();

      const adminControls = AUTH.isAdmin() ? `
        <div class="member-admin-btns">
          <button class="btn-member-edit"   onclick="MEMBERS.openEditMember(${m.id})">✎ Editar</button>
          <button class="btn-member-remove" onclick="MEMBERS.removeMember(${m.id})">✕ Remover</button>
        </div>` : '';

      const card = document.createElement('div');
      card.className = 'member-card';
      card.innerHTML = `
        <div class="member-avatar">${initials}</div>
        <div class="name">${m.name}</div>
        <div class="role">${m.role}</div>
        ${adminControls}`;
      grid.appendChild(card);
    });
  }

  /* ---- CADASTRO (operador) ---- */
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
      showToast('Solicitação enviada! Aguarde a aprovação do admin. 🪖');
    } catch(e) {
      alert('Erro ao enviar solicitação. Tente novamente.');
      console.error(e);
    }
  }

  /* ---- APROVAR / RECUSAR ---- */
  async function approveMember(id) {
    try {
      await DB.patch('members', id, { status: 'active' });
      const m = members.find(x => x.id === id);
      if (m) m.status = 'active';
      _renderAll();
      showToast('Operador aprovado e adicionado ao time! ✓');
    } catch(e) {
      alert('Erro ao aprovar membro.');
      console.error(e);
    }
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
    } catch(e) {
      alert('Erro ao recusar.');
      console.error(e);
    }
  }

  /* ---- EDITAR ---- */
  function openEditMember(id) {
    if (!AUTH.isAdmin()) return;
    const m = members.find(x => x.id === id);
    if (!m) return;
    editingMemberId = id;
    document.getElementById('edit-member-name').value = m.name;
    document.getElementById('edit-member-role').value = m.role;
    document.getElementById('modal-edit-member').classList.add('open');
  }

  async function saveEditMember() {
    const name = document.getElementById('edit-member-name').value.trim();
    const role = document.getElementById('edit-member-role').value.trim();
    if (!name) { alert('Preencha o nome.'); return; }

    try {
      await DB.patch('members', editingMemberId, { name, role });
      const m = members.find(x => x.id === editingMemberId);
      if (m) { m.name = name; m.role = role; }
      closeModal('modal-edit-member');
      _renderAll();
      showToast('Membro atualizado! ✓');
    } catch(e) {
      alert('Erro ao atualizar.');
      console.error(e);
    }
  }

  /* ---- REMOVER ---- */
  async function removeMember(id) {
    const m = members.find(x => x.id === id);
    if (!confirm('Remover ' + (m ? m.name : 'este membro') + ' do time?')) return;
    try {
      await DB.delete('members', id);
      const idx = members.findIndex(x => x.id === id);
      if (idx !== -1) members.splice(idx, 1);
      _renderAll();
      showToast((m ? m.name : 'Membro') + ' removido do time.');
    } catch(e) {
      alert('Erro ao remover.');
      console.error(e);
    }
  }

  /* ---- UTIL ---- */
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  return { init, render, renderFromMemory, approveMember, rejectMember, openEditMember, removeMember };

})();
