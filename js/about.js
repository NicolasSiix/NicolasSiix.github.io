/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   about.js — Quem Somos e Regras (editável pelo admin)
   ============================================================ */

const ABOUT = (() => {

  let editingKey = null;

  function init() {
    safeOn('btn-edit-quem-somos',    'click', () => openEdit('quem_somos', 'Quem Somos'));
    safeOn('btn-edit-regras',        'click', () => openEdit('regras', 'Regras do Time'));
    safeOn('modal-close-edit-content','click', () => closeModal('modal-edit-content'));
    safeOn('btn-cancel-edit-content','click',  () => closeModal('modal-edit-content'));
    safeOn('btn-save-content',       'click',  saveContent);
    safeOn('modal-edit-content', 'click', function(e) {
      if (e.target === this) closeModal('modal-edit-content');
    });
  }

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  async function render() {
    // Mostra botões de editar se admin
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';
    });

    try {
      const rows = await DB.get('content', '');

      rows.forEach(row => {
        if (row.key === 'quem_somos') renderContent('quem-somos-content', row.value);
        if (row.key === 'regras')     renderContent('regras-content', row.value);
      });

    } catch(e) {
      console.error('Erro ao carregar conteúdo:', e);
    }
  }

  function renderContent(elId, text) {
    const el = document.getElementById(elId);
    if (!el) return;
    // Converte quebras de linha em parágrafos
    el.innerHTML = text
      .split('\n')
      .filter(l => l.trim())
      .map(l => `<p>${l}</p>`)
      .join('');
  }

  function openEdit(key, title) {
    if (!AUTH.isAdmin()) return;
    editingKey = key;
    document.getElementById('edit-content-title').textContent = title;

    // Busca texto atual
    const elId = key === 'quem_somos' ? 'quem-somos-content' : 'regras-content';
    const el   = document.getElementById(elId);
    const text = el ? Array.from(el.querySelectorAll('p')).map(p => p.textContent).join('\n') : '';
    document.getElementById('edit-content-text').value = text;
    document.getElementById('modal-edit-content').classList.add('open');
  }

  async function saveContent() {
    const text = document.getElementById('edit-content-text').value.trim();
    if (!text) return;

    try {
      // Upsert — atualiza se existe, insere se não existe
      const existing = await DB.get('content', `key=eq.${editingKey}`);
      if (existing.length > 0) {
        await DB.patch('content', existing[0].id, { value: text, updated_at: new Date().toISOString() });
      } else {
        await DB.post('content', { key: editingKey, value: text });
      }

      closeModal('modal-edit-content');
      const elId = editingKey === 'quem_somos' ? 'quem-somos-content' : 'regras-content';
      renderContent(elId, text);
      showToast('Conteúdo atualizado! ✓');

    } catch(e) {
      alert('Erro ao salvar.');
      console.error(e);
    }
  }

  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  return { init, render };

})();
