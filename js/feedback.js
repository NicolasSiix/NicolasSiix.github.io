/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   feedback.js — Avaliações dos jogos finalizados
   ============================================================ */

const FEEDBACK = (() => {

  let currentGameId   = null;
  let currentMemberId = null;
  let currentMemberName = '';

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function init() {
    safeOn('modal-close-feedback-list', 'click', () => closeModal('modal-feedback-list'));
    safeOn('modal-feedback-list', 'click', function(e) { if (e.target === this) closeModal('modal-feedback-list'); });

    safeOn('modal-close-feedback-form', 'click', cancelFeedback);
    safeOn('btn-cancel-feedback', 'click', cancelFeedback);
    safeOn('btn-save-feedback',   'click', saveFeedback);
    safeOn('modal-feedback-form', 'click', function(e) { if (e.target === this) cancelFeedback(); });

    // Seletor de membro no formulário
    safeOn('feedback-member-select', 'change', function() {
      currentMemberId   = parseInt(this.value);
      const m = members.find(x => x.id === currentMemberId);
      currentMemberName = m ? m.name : '';
    });

    // Estrelas clicáveis
    document.addEventListener('click', e => {
      if (e.target && e.target.dataset.action === 'set-star') {
        const group = e.target.dataset.group;
        const val   = parseInt(e.target.dataset.val);
        setStars(group, val);
      }
    });
  }

  /* ---- RENDER PRINCIPAL ---- */
  async function render() {
    const container = document.getElementById('feedback-container');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Carregando...</div>';

    let finishedGames = [];
    try {
      const _t = new Date();
      const todayStr = _t.getFullYear() + '-' + String(_t.getMonth()+1).padStart(2,'0') + '-' + String(_t.getDate()).padStart(2,'0');
      console.log('[FEEDBACK] hoje:', todayStr);
      // Usa array global games já carregado
      if (games && games.length > 0) {
        finishedGames = games.filter(g => g.date < todayStr).sort((a,b) => b.date.localeCompare(a.date));
      } else {
        const all = await DB.get('games', 'order=date.desc');
        finishedGames = all.filter(g => g.date < todayStr);
      }
      console.log('[FEEDBACK] jogos finalizados:', finishedGames.length);
    } catch(e) {
      console.error('[FEEDBACK] erro:', e);
      container.innerHTML = '<div class="empty-state">Erro ao carregar jogos.</div>';
      return;
    }

    container.innerHTML = '';

    if (finishedGames.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhum jogo finalizado para avaliar ainda.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'feedback-grid';

    for (const g of finishedGames) {
      let feedbackCount = 0;
      let avgRecepcao = 0, avgOrg = 0, avgCampo = 0;

      try {
        const fbs = await DB.get('feedbacks', `game_id=eq.${g.id}`);
        feedbackCount = fbs.length;
        if (feedbackCount > 0) {
          avgRecepcao  = (fbs.reduce((s, f) => s + f.recepcao,    0) / feedbackCount).toFixed(1);
          avgOrg       = (fbs.reduce((s, f) => s + f.organizacao, 0) / feedbackCount).toFixed(1);
          avgCampo     = (fbs.reduce((s, f) => s + f.campo,       0) / feedbackCount).toFixed(1);
        }
      } catch(e) {}

      const [y, m, d] = g.date.split('-');
      const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

      const card = document.createElement('div');
      card.className = 'feedback-card';
      card.innerHTML = `
        <div class="feedback-card-header">
          <div class="feedback-date">${parseInt(d)} ${MONTHS_SHORT[parseInt(m)-1]}</div>
          <div class="feedback-game-name">${g.name}</div>
          <div class="feedback-local">📍 ${g.local || '—'}</div>
        </div>
        <div class="feedback-stars-preview">
          <div class="stars-row"><span>Recepção</span>${starsHtml(avgRecepcao)}</div>
          <div class="stars-row"><span>Organização</span>${starsHtml(avgOrg)}</div>
          <div class="stars-row"><span>Campo</span>${starsHtml(avgCampo)}</div>
        </div>
        <div class="feedback-card-footer">
          <span class="feedback-count">${feedbackCount} avaliação${feedbackCount !== 1 ? 'ões' : ''}</span>
          <div style="display:flex;gap:8px;">
            <button class="btn-outline" style="font-size:11px;padding:5px 10px;" data-gameid="${g.id}" data-action-fb="view">Ver avaliações</button>
            <button class="btn-gold"    style="font-size:11px;padding:5px 10px;" data-gameid="${g.id}" data-action-fb="add">Avaliar</button>
          </div>
        </div>`;

      card.querySelector('[data-action-fb="view"]').addEventListener('click', () => openFeedbackList(g));
      card.querySelector('[data-action-fb="add"]').addEventListener('click',  () => openFeedbackForm(g));

      grid.appendChild(card);
    }

    container.appendChild(grid);
  }

  function starsHtml(avg) {
    if (!avg || avg == 0) return '<span style="color:var(--text-muted);font-size:12px;">sem avaliação</span>';
    let html = '';
    for (let i = 1; i <= 3; i++) {
      html += `<span style="color:${i <= Math.round(avg) ? '#f5c518' : 'var(--border)'};">★</span>`;
    }
    return `${html} <span style="font-size:12px;color:var(--text-muted);">${avg}</span>`;
  }



  /* ---- LISTA DE FEEDBACKS ---- */
  async function openFeedbackList(g) {
    currentGameId = g.id;
    document.getElementById('feedback-list-title').textContent = g.name;
    document.getElementById('feedback-list-body').innerHTML = '<div class="empty-state">Carregando...</div>';
    document.getElementById('modal-feedback-list').classList.add('open');

    let fbs = [];
    try {
      fbs = await DB.get('feedbacks', `game_id=eq.${g.id}&order=created_at.desc`);
    } catch(e) {}

    const body = document.getElementById('feedback-list-body');
    body.innerHTML = '';

    if (fbs.length === 0) {
      body.innerHTML = '<div class="empty-state">Nenhuma avaliação ainda.</div>';
      return;
    }

    fbs.forEach(fb => {
      const m = members.find(x => x.id === fb.member_id);
      const name    = m ? m.name : 'Operador';
      const photo   = m ? m.photo_url : null;
      const parts   = name.trim().split(' ');
      const initials = (parts.length >= 2 ? parts[0][0]+parts[1][0] : parts[0].substring(0,2)).toUpperCase();

      const item = document.createElement('div');
      item.className = 'feedback-item';
      item.innerHTML = `
        <div class="feedback-item-header">
          ${photo
            ? `<img src="${photo}" class="feedback-avatar" />`
            : `<div class="feedback-avatar feedback-avatar-initials">${initials}</div>`}
          <div class="feedback-item-name">${name}</div>
          ${AUTH.isAdmin() ? `<button class="btn-delete-feedback" data-id="${fb.id}" title="Excluir avaliação" style="margin-left:auto;background:#2a1010;color:#c04040;border:1px solid #4a2020;border-radius:4px;width:28px;height:28px;cursor:pointer;font-size:13px;">🗑</button>` : ''}
        </div>
        <div class="feedback-item-stars">
          <div class="stars-row"><span>Recepção</span>${starsDisplay(fb.recepcao)}</div>
          <div class="stars-row"><span>Organização</span>${starsDisplay(fb.organizacao)}</div>
          <div class="stars-row"><span>Campo</span>${starsDisplay(fb.campo)}</div>
        </div>
        ${fb.comentario ? `<div class="feedback-comment">"${fb.comentario}"</div>` : ''}`;

      // Botão excluir
      const delBtn = item.querySelector('.btn-delete-feedback');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (!confirm('Excluir esta avaliação?')) return;
          try {
            await DB.delete('feedbacks', fb.id);
            item.remove();
            showToast('Avaliação excluída.');
            render();
          } catch(e) {
            alert('Erro ao excluir.');
          }
        });
      }

      body.appendChild(item);
    });
  }

  function starsDisplay(val) {
    let html = '';
    for (let i = 1; i <= 3; i++) {
      html += `<span style="color:${i <= val ? '#f5c518' : 'var(--border)'};">★</span>`;
    }
    return html;
  }

  /* ---- FORMULÁRIO DE AVALIAÇÃO ---- */
  async function openFeedbackForm(g) {
    currentGameId = g.id;

    // Popula select de membros
    const select = document.getElementById('feedback-member-select');
    if (!select) return;
    select.innerHTML = '<option value="">— Selecione seu nome —</option>';

    const active = members.filter(m => m.status === 'active');
    active.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });

    currentMemberId   = null;
    currentMemberName = '';

    // Reset estrelas
    ['recepcao','organizacao','campo'].forEach(g => setStars(g, 0));
    const comentario = document.getElementById('feedback-comentario');
    if (comentario) comentario.value = '';

    document.getElementById('feedback-form-title').textContent = g.name;
    document.getElementById('modal-feedback-form').classList.add('open');
  }

  function setStars(group, val) {
    for (let i = 1; i <= 3; i++) {
      const star = document.getElementById(`star-${group}-${i}`);
      if (star) star.style.color = i <= val ? '#f5c518' : 'var(--text-muted)';
    }
    const hidden = document.getElementById(`feedback-${group}`);
    if (hidden) hidden.value = val;
  }

  async function saveFeedback() {
    const memberId    = parseInt(document.getElementById('feedback-member-select').value);
    const recepcao    = parseInt(document.getElementById('feedback-recepcao').value)    || 0;
    const organizacao = parseInt(document.getElementById('feedback-organizacao').value) || 0;
    const campo       = parseInt(document.getElementById('feedback-campo').value)       || 0;
    const comentario  = document.getElementById('feedback-comentario').value.trim();

    if (!memberId)    { alert('Selecione seu nome.');            return; }
    if (!recepcao)    { alert('Avalie a recepção.');             return; }
    if (!organizacao) { alert('Avalie a organização do jogo.');  return; }
    if (!campo)       { alert('Avalie o campo.');                return; }

    // Verifica se já avaliou
    try {
      const existing = await DB.get('feedbacks', `game_id=eq.${currentGameId}&member_id=eq.${memberId}`);
      if (existing.length > 0) {
        alert('Você já avaliou este jogo!');
        return;
      }
    } catch(e) {}

    const btn = document.getElementById('btn-save-feedback');
    if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

    try {
      await DB.post('feedbacks', { game_id: currentGameId, member_id: memberId, recepcao, organizacao, campo, comentario });
      closeModal('modal-feedback-form');
      showToast('Avaliação enviada! ⭐');
      render();
    } catch(e) {
      alert('Erro ao salvar avaliação.');
      console.error(e);
    } finally {
      if (btn) { btn.textContent = 'Enviar Avaliação'; btn.disabled = false; }
    }
  }

  function cancelFeedback() {
    closeModal('modal-feedback-form');
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

  return { init, render };

})();
