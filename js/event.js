/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   event.js — Evento em destaque (banner + aba, editável pelo admin)
   Persistência: tabela `content`, chave 'evento' (valor = JSON).
   ============================================================ */

const EVENT = (() => {

  const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const MESES_LONGO = ['janeiro','fevereiro','março','abril','maio','junho',
                       'julho','agosto','setembro','outubro','novembro','dezembro'];

  let data = null;      // objeto do evento
  let rowId = null;     // id da linha em content

  function safeOn(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
  function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function isUrl(s) { return /^https?:\/\//i.test((s || '').trim()); }

  function dateParts(dstr) {
    if (!dstr) return null;
    const [y,m,d] = dstr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return { day: d, month: MESES[m-1], longo: `${d} de ${MESES_LONGO[m-1]} de ${y}` };
  }

  function goToEventTab() {
    const btn = document.querySelector('[data-page="event"]');
    if (btn) btn.click();
  }

  /* ---- CARREGA DO BANCO ---- */
  async function load() {
    try {
      const rows = await DB.get('content', 'key=eq.evento');
      if (rows && rows.length) {
        rowId = rows[0].id;
        try { data = JSON.parse(rows[0].value); } catch(e) { data = null; }
      } else {
        rowId = null; data = null;
      }
    } catch(e) {
      console.warn('[EVENT] não foi possível carregar o evento:', e);
      data = null;
    }
    refreshNavTab();
  }

  /* mostra/esconde a aba "Evento" no menu */
  function refreshNavTab() {
    const tab = document.querySelector('.nav-btn-event');
    if (!tab) return;
    const visible = (data && data.active) || AUTH.isAdmin();
    tab.style.display = visible ? '' : 'none';
  }

  /* ---- BANNER NA HOME ---- */
  function renderBanner() {
    const el = document.getElementById('event-banner');
    if (!el) return;

    if (!data || !data.active) { el.style.display = 'none'; el.innerHTML = ''; return; }

    const dp = dateParts(data.date);
    el.innerHTML = `
      <div class="event-banner-flag">🏆 Próximo Evento</div>
      <div class="event-banner-main">
        ${dp ? `<div class="event-banner-date"><span class="d">${dp.day}</span><span class="m">${dp.month}</span></div>` : ''}
        <div class="event-banner-info">
          <h3>${esc(data.title) || 'Evento'}</h3>
          <div class="event-banner-meta">
            ${data.local ? `<span>📍 ${isUrl(data.local) ? 'Ver no mapa' : esc(data.local)}</span>` : ''}
            ${data.time ? `<span>⏰ ${esc(data.time)}</span>` : ''}
          </div>
        </div>
      </div>
      <span class="event-banner-cta">Ver detalhes →</span>`;
    el.style.display = 'flex';
    el.onclick = goToEventTab;
  }

  /* ---- PÁGINA DEDICADA ---- */
  function renderPage() {
    const el = document.getElementById('event-page-content');
    if (!el) return;

    const btnEdit = document.getElementById('btn-edit-event');
    if (btnEdit) btnEdit.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';

    if (!data) {
      el.innerHTML = AUTH.isAdmin()
        ? `<div class="empty-state">Nenhum evento criado ainda. Clique em “Editar Evento” para criar. 🏆</div>`
        : `<div class="empty-state">Nenhum evento em destaque no momento. Fique de olho! 👀</div>`;
      return;
    }
    if (!data.active && !AUTH.isAdmin()) {
      el.innerHTML = `<div class="empty-state">Nenhum evento em destaque no momento. Fique de olho! 👀</div>`;
      return;
    }

    const dp = dateParts(data.date);
    const descHtml = (data.description || '')
      .split('\n').filter(l => l.trim()).map(l => `<p>${esc(l)}</p>`).join('');

    el.innerHTML = `
      <div class="event-card ${data.active ? '' : 'is-inactive'}">
        ${!data.active ? `<div class="event-inactive-note">⚠ Evento desativado — visível só para o admin</div>` : ''}
        ${data.image ? `<div class="event-flyer"><img src="${esc(data.image)}" alt="${esc(data.title)}" /></div>` : ''}
        <div class="event-body">
          <div class="event-flag">🏆 Evento em Destaque</div>
          <h2 class="event-title">${esc(data.title) || 'Evento'}</h2>
          ${data.subtitle ? `<div class="event-subtitle">${esc(data.subtitle)}</div>` : ''}
          <div class="event-facts">
            ${dp ? `<div class="event-fact"><span class="lbl">Data</span><span class="val">${dp.longo}</span></div>` : ''}
            ${data.time ? `<div class="event-fact"><span class="lbl">Horário</span><span class="val">${esc(data.time)}</span></div>` : ''}
            ${data.local ? `<div class="event-fact"><span class="lbl">Local</span><span class="val">${isUrl(data.local) ? `<a href="${esc(data.local)}" target="_blank" rel="noopener" class="event-map-link">📍 Ver localização no mapa</a>` : esc(data.local)}</span></div>` : ''}
          </div>
          ${descHtml ? `<div class="event-desc">${descHtml}</div>` : ''}
          <div class="event-actions">
            ${(data.cta_link) ? `<a href="${esc(data.cta_link)}" target="_blank" rel="noopener" class="btn-gold event-cta">${esc(data.cta_label) || 'Quero participar'} →</a>` : ''}
            ${(data.whatsapp) ? `<a href="${esc(data.whatsapp)}" target="_blank" rel="noopener" class="btn-whatsapp event-wa">📱 Entrar no Grupo do WhatsApp</a>` : ''}
          </div>
        </div>
      </div>`;
  }

  function refresh() { refreshNavTab(); renderBanner(); renderPage(); }

  /* ---- ADMIN: MODAL ---- */
  function openEdit() {
    if (!AUTH.isAdmin()) return;
    const d = data || {};
    document.getElementById('ev-active').checked   = !!d.active;
    document.getElementById('ev-title').value      = d.title || '';
    document.getElementById('ev-subtitle').value   = d.subtitle || '';
    document.getElementById('ev-date').value       = d.date || '';
    document.getElementById('ev-time').value       = d.time || '08:00';
    document.getElementById('ev-local').value      = d.local || '';
    document.getElementById('ev-desc').value       = d.description || '';
    document.getElementById('ev-cta-label').value  = d.cta_label || 'Quero participar';
    document.getElementById('ev-cta-link').value   = d.cta_link || '';
    document.getElementById('ev-whatsapp').value   = d.whatsapp || '';
    document.getElementById('ev-image-url').value  = d.image || '';
    document.getElementById('ev-image-file').value = '';
    renderImagePreview(d.image || '');
    document.getElementById('modal-edit-event').classList.add('open');
  }

  function renderImagePreview(url) {
    const p = document.getElementById('ev-image-preview');
    if (!p) return;
    p.innerHTML = url ? `<img src="${esc(url)}" style="max-width:100%;max-height:180px;border-radius:8px;" />` : '';
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const fileName = `event_${Date.now()}_${Math.random().toString(36).substr(2,5)}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON,
        'Content-Type': file.type,
        'x-upsert': 'true'
      },
      body: file
    });
    if (!res.ok) throw new Error(await res.text());
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
  }

  async function save() {
    const btn = document.getElementById('btn-save-event');
    btn.disabled = true; const oldTxt = btn.textContent; btn.textContent = 'Salvando...';

    try {
      let imageUrl = document.getElementById('ev-image-url').value || '';
      const fileInput = document.getElementById('ev-image-file');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        btn.textContent = 'Enviando imagem...';
        imageUrl = await uploadImage(fileInput.files[0]);
      }

      const obj = {
        active:      document.getElementById('ev-active').checked,
        title:       document.getElementById('ev-title').value.trim(),
        subtitle:    document.getElementById('ev-subtitle').value.trim(),
        date:        document.getElementById('ev-date').value,
        time:        document.getElementById('ev-time').value,
        local:       document.getElementById('ev-local').value.trim(),
        description: document.getElementById('ev-desc').value.trim(),
        cta_label:   document.getElementById('ev-cta-label').value.trim(),
        cta_link:    document.getElementById('ev-cta-link').value.trim(),
        whatsapp:    document.getElementById('ev-whatsapp').value.trim(),
        image:       imageUrl
      };

      const value = JSON.stringify(obj);

      if (rowId) {
        await DB.patch('content', rowId, { value, updated_at: new Date().toISOString() });
      } else {
        const created = await DB.post('content', { key: 'evento', value });
        if (created && created[0]) rowId = created[0].id;
      }

      data = obj;
      closeModal('modal-edit-event');
      refresh();
      showToast('Evento salvo! 🏆');

    } catch(e) {
      console.error('[EVENT] erro ao salvar:', e);
      alert('Erro ao salvar o evento.');
    } finally {
      btn.disabled = false; btn.textContent = oldTxt;
    }
  }

  function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }
  function showToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  function init() {
    safeOn('btn-edit-event',        'click', openEdit);
    safeOn('modal-close-edit-event','click', () => closeModal('modal-edit-event'));
    safeOn('btn-cancel-edit-event', 'click', () => closeModal('modal-edit-event'));
    safeOn('btn-save-event',        'click', save);
    safeOn('modal-edit-event', 'click', function(e){ if (e.target === this) closeModal('modal-edit-event'); });

    // preview do flyer ao escolher arquivo
    safeOn('ev-image-file', 'change', function() {
      const f = this.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = e => renderImagePreview(e.target.result);
      reader.readAsDataURL(f);
    });
  }

  return { init, load, refresh, renderBanner, renderPage, refreshNavTab };

})();
