/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   photos.js — Galeria de fotos com Supabase Storage
   ============================================================ */

const PHOTOS = (() => {

  let viewingPhotoId = null;

  function init() {
    document.addEventListener('click', e => {
      if (e.target && e.target.id === 'btn-add-photo') openAddPhoto();
    });

    safeOn('modal-close-add-photo',  'click', () => closeModal('modal-add-photo'));
    safeOn('btn-cancel-add-photo',   'click', () => closeModal('modal-add-photo'));
    safeOn('btn-save-photo',         'click', uploadPhoto);
    safeOn('modal-close-view-photo', 'click', () => closeModal('modal-view-photo'));
    safeOn('btn-delete-photo',       'click', deletePhoto);

    safeOn('modal-add-photo', 'click', function(e) { if (e.target === this) closeModal('modal-add-photo'); });
    safeOn('modal-view-photo','click', function(e) { if (e.target === this) closeModal('modal-view-photo'); });

    // Preview ao selecionar arquivo
    safeOn('photo-file', 'change', function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('photo-preview').innerHTML =
          `<img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:4px;margin-top:8px;" />`;
      };
      reader.readAsDataURL(file);
    });
  }

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  async function render() {
    const grid = document.getElementById('photos-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state">Carregando fotos...</div>';

    // Mostra botão de adicionar se admin
    const btnAdd = document.getElementById('btn-add-photo');
    if (btnAdd) btnAdd.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';

    let photos = [];
    try {
      photos = await DB.get('photos', 'order=created_at.desc');
    } catch(e) {
      grid.innerHTML = '<div class="empty-state">Erro ao carregar fotos.</div>';
      return;
    }

    grid.innerHTML = '';

    if (photos.length === 0) {
      grid.innerHTML = '<div class="empty-state">Nenhuma foto adicionada ainda.</div>';
      return;
    }

    photos.forEach(p => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.innerHTML = `
        <img src="${p.url}" alt="${p.caption || ''}" loading="lazy" />
        ${p.caption ? `<div class="photo-caption">${p.caption}</div>` : ''}`;
      item.addEventListener('click', () => openViewPhoto(p));
      grid.appendChild(item);
    });
  }

  function openAddPhoto() {
    if (!AUTH.isAdmin()) return;
    document.getElementById('photo-file').value = '';
    document.getElementById('photo-caption').value = '';
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('modal-add-photo').classList.add('open');
  }

  async function uploadPhoto() {
    const fileInput = document.getElementById('photo-file');
    const caption   = document.getElementById('photo-caption').value.trim();
    const file      = fileInput.files[0];

    if (!file) { alert('Selecione uma imagem.'); return; }

    const btn = document.getElementById('btn-save-photo');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    try {
      // Upload para Supabase Storage
      const ext      = file.name.split('.').pop();
      const fileName = `photo_${Date.now()}.${ext}`;

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

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;

      // Salva referência no banco
      await DB.post('photos', { url: publicUrl, caption });

      closeModal('modal-add-photo');
      showToast('Foto adicionada! 📷');
      render();

    } catch(e) {
      alert('Erro ao enviar foto. Tente novamente.');
      console.error(e);
    } finally {
      btn.textContent = 'Enviar Foto';
      btn.disabled = false;
    }
  }

  function openViewPhoto(p) {
    viewingPhotoId = p.id;
    document.getElementById('view-photo-img').src       = p.url;
    document.getElementById('view-photo-caption').textContent = p.caption || '';
    const delBtn = document.getElementById('btn-delete-photo');
    if (delBtn) delBtn.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';
    document.getElementById('modal-view-photo').classList.add('open');
  }

  async function deletePhoto() {
    if (!confirm('Excluir esta foto?')) return;
    try {
      await DB.delete('photos', viewingPhotoId);
      closeModal('modal-view-photo');
      showToast('Foto excluída.');
      render();
    } catch(e) {
      alert('Erro ao excluir.');
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
