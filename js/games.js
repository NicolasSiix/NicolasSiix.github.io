/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   games.js — Missões, finalizados, check-in, editar e excluir
   ============================================================ */

const GAMES = (() => {

  const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MONTHS_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  let activeGameId   = null;
  let activeCheckins = [];
  let currentTab     = 'upcoming';
  let editingGameId  = null;

  function todayLocal() {
    const t = new Date();
    return t.getFullYear() + '-' +
      String(t.getMonth() + 1).padStart(2, '0') + '-' +
      String(t.getDate()).padStart(2, '0');
  }

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function init() {
    safeOn('modal-close-detail', 'click', () => closeModal('modal-detail'));
    safeOn('btn-checkin',        'click', doCheckin);
    safeOn('checkin-name',       'keydown', e => { if (e.key === 'Enter') doCheckin(); });
    safeOn('modal-close-add',    'click', cancelForm);
    safeOn('btn-cancel-add',     'click', cancelForm);
    safeOn('btn-save-game',      'click', saveGame);

    ['modal-detail','modal-add'].forEach(id => {
      safeOn(id, 'click', function(e) { if (e.target === this) closeModal(id); });
    });

    document.addEventListener('click', e => {
      if (e.target && e.target.id === 'btn-new-game') openAddForm();
      if (e.target && e.target.id === 'tab-upcoming') switchTab('upcoming');
      if (e.target && e.target.id === 'tab-finished') switchTab('finished');
    });
  }

  /* ---- TABS ---- */
  function switchTab(tab) {
    currentTab = tab;
    const tabUp  = document.getElementById('tab-upcoming');
    const tabFin = document.getElementById('tab-finished');
    if (tabUp)  tabUp.classList.toggle('active',  tab === 'upcoming');
    if (tabFin) tabFin.classList.toggle('active', tab === 'finished');
    _renderGameCards();
  }

  /* ---- LISTA DE MISSÕES ---- */
  async function renderList() {
    const list = document.getElementById('games-list');
    if (!list) return;
    list.innerHTML = '<div class="empty-state">Carregando...</div>';

    try {
      games = await DB.get('games', 'order=date.asc');
    } catch(e) {
      list.innerHTML = '<div class="empty-state">Erro ao carregar missões.</div>';
      return;
    }

    const tabUp  = document.getElementById('tab-upcoming');
    const tabFin = document.getElementById('tab-finished');
    if (tabUp)  tabUp.classList.toggle('active',  currentTab === 'upcoming');
    if (tabFin) tabFin.classList.toggle('active', currentTab === 'finished');

    await _renderGameCards();
  }

  async function _renderGameCards() {
    const list = document.getElementById('games-list');
    if (!list) return;

    const todayStr = todayLocal();
    const upcoming = games.filter(g => g.date >= todayStr);
    const finished = games.filter(g => g.date <  todayStr).reverse();
    const toShow   = currentTab === 'upcoming' ? upcoming : finished;

    list.innerHTML = '';

    if (toShow.length === 0) {
      list.innerHTML = `<div class="empty-state">${currentTab === 'upcoming' ? 'Nenhuma missão agendada.' : 'Nenhum jogo finalizado ainda.'}</div>`;
      return;
    }

    let allCheckins = [];
    try { allCheckins = await DB.get('checkins', 'select=game_id'); } catch(e) {}

    toShow.forEach(g => {
      const [y, m, d] = g.date.split('-');
      const count  = allCheckins.filter(c => c.game_id === g.id).length;
      const full   = count >= g.slots;
      const isPast = currentTab === 'finished';

      const card = document.createElement('div');
      card.className = 'game-card' + (count > 0 ? ' confirmed' : '') + (isPast ? ' finished' : '');
      card.style.position = 'relative';
      card.innerHTML = `
        <div class="game-date-block" style="${isPast ? 'opacity:0.6' : ''}">
          <div class="day">${parseInt(d)}</div>
          <div class="month">${MONTHS_SHORT[parseInt(m) - 1]}</div>
        </div>
        <div class="game-info">
          <h3>${g.name} ${isPast ? '<span class="badge-done">FINALIZADO</span>' : ''}</h3>
          <div class="game-meta">
            <span>📍 ${g.local || '—'}</span>
            <span>⏰ ${g.time || '—'}</span>
          </div>
          <div class="game-tags">
            <span class="tag mode">${g.mode || '—'}</span>
            ${!isPast ? `<span class="tag ${full ? 'full' : 'open'}">${full ? 'LOTADO' : 'VAGAS ABERTAS'}</span>` : ''}
          </div>
        </div>
        <div class="checkin-count">
          <div class="num">${count}</div>
          <div class="label">${isPast ? 'Presentes' : 'Check-ins'}</div>
        </div>`;

      // Botões admin
      if (AUTH.isAdmin()) {
        const adminBtns = document.createElement('div');
        adminBtns.className = 'game-admin-btns';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit-game';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Editar missão';
        editBtn.addEventListener('click', e => {
          e.stopPropagation();
          openEditForm(g.id);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-game';
        delBtn.innerHTML = '🗑';
        delBtn.title = 'Excluir missão';
        delBtn.addEventListener('click', async e => {
          e.stopPropagation();
          if (!confirm('Excluir "' + g.name + '"? Esta ação não pode ser desfeita.')) return;
          try {
            await DB.delete('games', g.id);
            games = games.filter(x => x.id !== g.id);
            CALENDAR.render();
            updateStats();
            await _renderGameCards();
          } catch(err) {
            alert('Erro ao excluir missão.');
            console.error(err);
          }
        });

        adminBtns.appendChild(editBtn);
        adminBtns.appendChild(delBtn);
        card.appendChild(adminBtns);
      }

      card.addEventListener('click', () => openDetail(g.id));
      list.appendChild(card);
    });
  }

  /* ---- FORMULÁRIO: ADICIONAR ---- */
  function openAddForm() {
    if (!AUTH.isAdmin()) return;
    editingGameId = null;
    clearForm();
    document.getElementById('modal-add-title').textContent = 'Nova Missão';
    document.getElementById('btn-save-game').textContent   = 'Adicionar Missão';
    document.getElementById('modal-add').classList.add('open');
  }

  /* ---- FORMULÁRIO: EDITAR ---- */
  function openEditForm(id) {
    if (!AUTH.isAdmin()) return;
    const g = games.find(x => x.id === id);
    if (!g) return;
    editingGameId = id;

    document.getElementById('f-name').value  = g.name         || '';
    document.getElementById('f-date').value  = g.date         || '';
    document.getElementById('f-time').value  = g.time         || '';
    document.getElementById('f-slots').value = g.slots        || '';
    document.getElementById('f-local').value = g.local        || '';
    document.getElementById('f-mode').value  = g.mode         || 'Operação';
    document.getElementById('f-desc').value  = g.description  || '';

    document.getElementById('modal-add-title').textContent = 'Editar Missão';
    document.getElementById('btn-save-game').textContent   = 'Salvar Alterações';
    document.getElementById('modal-add').classList.add('open');
  }

  /* ---- SALVAR (novo ou edição) ---- */
  async function saveGame() {
    const name  = document.getElementById('f-name').value.trim();
    const date  = document.getElementById('f-date').value;
    const time  = document.getElementById('f-time').value;
    const slots = parseInt(document.getElementById('f-slots').value) || 20;
    const local = document.getElementById('f-local').value.trim();
    const mode  = document.getElementById('f-mode').value;
    const desc  = document.getElementById('f-desc').value.trim();

    if (!name || !date) { alert('Preencha nome e data.'); return; }

    try {
      if (editingGameId) {
        // Editar existente
        await DB.patch('games', editingGameId, { name, date, time, slots, local, mode, description: desc });
        const g = games.find(x => x.id === editingGameId);
        if (g) Object.assign(g, { name, date, time, slots, local, mode, description: desc });
      } else {
        // Novo jogo
        const result = await DB.post('games', { name, date, time, slots, local, mode, description: desc });
        games.push(result[0]);
      }

      cancelForm();
      CALENDAR.render();
      updateStats();
      await _renderGameCards();

    } catch(e) {
      alert('Erro ao salvar missão.');
      console.error(e);
    }
  }

  function cancelForm() {
    editingGameId = null;
    clearForm();
    closeModal('modal-add');
    // Reseta título e botão
    const title = document.getElementById('modal-add-title');
    const btn   = document.getElementById('btn-save-game');
    if (title) title.textContent = 'Nova Missão';
    if (btn)   btn.textContent   = 'Adicionar Missão';
  }

  function clearForm() {
    ['f-name','f-date','f-local','f-desc','f-slots'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const time = document.getElementById('f-time');
    if (time) time.value = '08:00';
  }

  /* ---- MODAL DE DETALHES ---- */
  async function openDetail(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;
    activeGameId = id;

    const isPast = g.date < todayLocal();
    const [y, m, d] = g.date.split('-');

    document.getElementById('detail-title').textContent  = g.name + (isPast ? ' ✓' : '');
    document.getElementById('detail-sub').textContent    =
      parseInt(d) + ' de ' + MONTHS_FULL[parseInt(m) - 1] + ', ' + y + '  |  ' + (g.local || '—');
    document.getElementById('detail-time').textContent   = g.time  || '—';
    document.getElementById('detail-local').textContent  = g.local || '—';
    document.getElementById('detail-mode').textContent   = g.mode  || '—';
    document.getElementById('detail-desc').textContent   = g.description || '—';

    const checkinInput = document.querySelector('.checkin-section .member-input');
    if (checkinInput) checkinInput.style.display = isPast ? 'none' : 'flex';

    document.getElementById('checkin-list').innerHTML = '<div class="empty-state">Carregando...</div>';
    document.getElementById('modal-detail').classList.add('open');

    try {
      activeCheckins = await DB.get('checkins', `game_id=eq.${id}&order=created_at.asc`);
    } catch(e) { activeCheckins = []; }

    document.getElementById('detail-slots').textContent =
      activeCheckins.length + ' / ' + g.slots + (isPast ? ' presentes' : ' confirmados');
    renderCheckins();
  }

  function renderCheckins() {
    const list = document.getElementById('checkin-list');
    list.innerHTML = '';
    if (activeCheckins.length === 0) {
      list.innerHTML = '<div class="empty-state">Nenhum check-in ainda. Seja o primeiro!</div>';
      return;
    }
    activeCheckins.forEach(c => {
      const item = document.createElement('div');
      item.className = 'checkin-item';

      const left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;flex:1;';
      left.innerHTML = `<div class="status-dot"></div><span class="member-name">${c.name}</span>`;

      const right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:8px;';
      right.innerHTML = `<span class="checkin-time">✓ Confirmado</span>`;

      // Botão cancelar — para admin remove direto, para operador pede confirmação do nome
      const del = document.createElement('button');
      del.textContent = '✕';
      del.title = 'Cancelar check-in';
      del.style.cssText = 'background:#2a1010;color:#c04040;border:1px solid #4a2020;border-radius:3px;width:22px;height:22px;cursor:pointer;font-size:11px;font-weight:700;flex-shrink:0;';
      del.addEventListener('click', async () => {
        if (!AUTH.isAdmin()) {
          const confirm_name = prompt('Digite seu nome para cancelar o check-in:');
          if (!confirm_name) return;
          if (confirm_name.trim().toLowerCase() !== c.name.toLowerCase()) {
            alert('Nome incorreto. Só você pode cancelar seu próprio check-in.');
            return;
          }
        }
        try {
          await DB.delete('checkins', c.id);
          activeCheckins = activeCheckins.filter(x => x.id !== c.id);
          const g = games.find(x => x.id === activeGameId);
          document.getElementById('detail-slots').textContent =
            activeCheckins.length + ' / ' + (g ? g.slots : '?') + ' confirmados';
          renderCheckins();
        } catch(e) {
          alert('Erro ao cancelar check-in.');
          console.error(e);
        }
      });
      right.appendChild(del);

      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    });
  }

  async function doCheckin() {
    const input = document.getElementById('checkin-name');
    const name  = input.value.trim();
    if (!name) return;

    if (activeCheckins.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Você já fez check-in nesta missão!'); return;
    }

    const g = games.find(x => x.id === activeGameId);
    if (g && activeCheckins.length >= g.slots) {
      alert('Vagas esgotadas!'); return;
    }

    try {
      const result = await DB.post('checkins', { game_id: activeGameId, name });
      activeCheckins.push(result[0]);
      input.value = '';
      document.getElementById('detail-slots').textContent =
        activeCheckins.length + ' / ' + (g ? g.slots : '?') + ' confirmados';
      renderCheckins();
    } catch(e) {
      alert('Erro ao fazer check-in.');
      console.error(e);
    }
  }

  /* ---- STATS ---- */
  function updateStats() {
    document.getElementById('stat-games').textContent = games.length;
    const todayStr = todayLocal();
    const next = games
      .filter(g => g.date >= todayStr)
      .sort((a,b) => a.date.localeCompare(b.date))[0];
    if (next) {
      const diff = Math.round((new Date(next.date.replace(/-/g,'/')) - new Date(todayStr.replace(/-/g,'/'))) / 86400000);
      document.getElementById('stat-next').textContent = diff === 0 ? 'Hoje!' : diff;
    } else {
      document.getElementById('stat-next').textContent = '—';
    }
  }

  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  return { init, renderList, openDetail, updateStats };

})();
