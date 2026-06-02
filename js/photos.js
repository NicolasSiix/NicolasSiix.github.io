/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   photos.js — Galeria com álbuns e vitrine de fotos
   ============================================================ */

const PHOTOS = (() => {

  let currentAlbumId   = null;
  let currentAlbumName = '';
  let viewingPhotoId   = null;
  let currentPhotos    = [];
  let currentPhotoIndex = 0;

  function safeOn(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  }

  function init() {
    // Botões admin
    document.addEventListener('click', e => {
      if (e.target && e.target.id === 'btn-add-photo')   openAddPhoto();
      if (e.target && e.target.id === 'btn-new-album')   openNewAlbum();
    });

    // Modal novo álbum
    safeOn('modal-close-new-album',  'click', () => closeModal('modal-new-album'));
    safeOn('btn-cancel-new-album',   'click', () => closeModal('modal-new-album'));
    safeOn('btn-save-new-album',     'click', saveNewAlbum);
    safeOn('modal-new-album', 'click', function(e) { if (e.target === this) closeModal('modal-new-album'); });

    // Modal adicionar foto
    safeOn('modal-close-add-photo',  'click', () => closeModal('modal-add-photo'));
    safeOn('btn-cancel-add-photo',   'click', () => closeModal('modal-add-photo'));
    safeOn('btn-save-photo',         'click', uploadPhoto);
    safeOn('modal-add-photo', 'click', function(e) { if (e.target === this) closeModal('modal-add-photo'); });

    // Vitrine (lightbox)
    safeOn('modal-close-lightbox', 'click', () => closeModal('modal-lightbox'));
    safeOn('btn-lightbox-prev',    'click', lightboxPrev);
    safeOn('btn-lightbox-next',    'click', lightboxNext);
    safeOn('btn-delete-photo',     'click', deletePhoto);
    safeOn('modal-lightbox', 'click', function(e) { if (e.target === this) closeModal('modal-lightbox'); });

    // Teclado para navegar na vitrine
    document.addEventListener('keydown', e => {
      const lb = document.getElementById('modal-lightbox');
      if (!lb || !lb.classList.contains('open')) return;
      if (e.key === 'ArrowLeft')  lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'Escape')     closeModal('modal-lightbox');
    });

    // Preview foto
    safeOn('photo-file', 'change', function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('photo-preview').innerHTML =
          `<img src="${e.target.result}" style="max-width:100%;max-height:180px;border-radius:4px;margin-top:8px;" />`;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---- RENDER PRINCIPAL (lista de álbuns) ---- */
  async function render() {
    const container = document.getElementById('photos-container');
    if (!container) return;

    // Atualiza botões admin
    const btnAdd   = document.getElementById('btn-add-photo');
    const btnAlbum = document.getElementById('btn-new-album');
    if (btnAdd)   btnAdd.style.display   = (AUTH.isAdmin() && currentAlbumId) ? 'inline-block' : 'none';
    if (btnAlbum) btnAlbum.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';

    if (currentAlbumId) {
      await renderAlbumPhotos();
    } else {
      await renderAlbumGrid();
    }
  }

  /* ---- LISTA DE ÁLBUNS ---- */
  async function renderAlbumGrid() {
    const container = document.getElementById('photos-container');
    container.innerHTML = '<div class="empty-state">Carregando álbuns...</div>';

    let albums = [];
    try {
      albums = await DB.get('albums', 'order=created_at.desc');
    } catch(e) {
      container.innerHTML = '<div class="empty-state">Erro ao carregar álbuns.</div>';
      return;
    }

    container.innerHTML = '';

    if (albums.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhum álbum criado ainda.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'albums-grid';

    albums.forEach(album => {
      const card = document.createElement('div');
      card.className = 'album-card';
      card.innerHTML = `
        <div class="album-cover">
          ${album.cover_url
            ? `<img src="${album.cover_url}" alt="${album.name}" />`
            : `<div class="album-cover-placeholder">📷</div>`}
          ${AUTH.isAdmin() ? `<button class="btn-delete-album" data-id="${album.id}" title="Excluir álbum">🗑</button>` : ''}
        </div>
        <div class="album-name">${album.name}</div>`;

      // Clique no card abre o álbum (exceto no botão excluir)
      card.addEventListener('click', async e => {
        if (e.target.classList.contains('btn-delete-album') || e.target.dataset.id) return;
        currentAlbumId   = album.id;
        currentAlbumName = album.name;
        await render();
      });

      // Botão excluir álbum
      const delBtn = card.querySelector('.btn-delete-album');
      if (delBtn) {
        delBtn.addEventListener('click', async e => {
          e.stopPropagation();
          if (!confirm(`Excluir o álbum "${album.name}" e todas as fotos?`)) return;
          try {
            await DB.delete('albums', album.id);
            await renderAlbumGrid();
          } catch(err) {
            alert('Erro ao excluir álbum.');
          }
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  /* ---- FOTOS DO ÁLBUM (vitrine) ---- */
  async function renderAlbumPhotos() {
    const container = document.getElementById('photos-container');

    // Breadcrumb para voltar
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:20px;';
    header.innerHTML = `
      <button id="btn-back-albums" class="btn-outline" style="padding:6px 14px;font-size:12px;">← Voltar</button>
      <div class="section-title" style="margin-bottom:0;">${currentAlbumName}</div>`;

    container.innerHTML = '';
    container.appendChild(header);

    document.getElementById('btn-back-albums').addEventListener('click', () => {
      currentAlbumId   = null;
      currentAlbumName = '';
      render();
    });

    // Atualiza botão adicionar foto
    const btnAdd = document.getElementById('btn-add-photo');
    if (btnAdd) btnAdd.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';

    // Botão para qualquer um adicionar foto
    const btnAny = document.createElement('button');
    btnAny.className = 'btn-outline';
    btnAny.style.cssText = 'margin-bottom:20px;display:block;';
    btnAny.textContent = '+ Adicionar Foto';
    btnAny.addEventListener('click', openAddPhoto);
    container.appendChild(btnAny);

    let photos = [];
    try {
      photos = await DB.get('photos', `album_id=eq.${currentAlbumId}&order=created_at.asc`);
    } catch(e) {
      container.innerHTML += '<div class="empty-state">Erro ao carregar fotos.</div>';
      return;
    }

    currentPhotos = photos;

    if (photos.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhuma foto neste álbum ainda. Seja o primeiro a adicionar!';
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'photos-grid';

    photos.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.innerHTML = `
        <img src="${p.url}" alt="${p.caption || ''}" loading="lazy" />
        ${p.caption ? `<div class="photo-caption">${p.caption}</div>` : ''}`;
      item.addEventListener('click', () => openLightbox(idx));
      grid.appendChild(item);
    });

    container.appendChild(grid);
  }

  /* ---- CRIAR ÁLBUM ---- */
  function openNewAlbum() {
    if (!AUTH.isAdmin()) return;
    document.getElementById('new-album-name').value = '';
    document.getElementById('modal-new-album').classList.add('open');
    document.getElementById('new-album-name').focus();
  }

  async function saveNewAlbum() {
    const name = document.getElementById('new-album-name').value.trim();
    if (!name) { alert('Digite o nome do álbum.'); return; }

    const btn = document.getElementById('btn-save-new-album');
    btn.textContent = 'Criando...';
    btn.disabled = true;

    try {
      await DB.post('albums', { name });
      closeModal('modal-new-album');
      showToast('Álbum criado! 📷');
      await renderAlbumGrid();
    } catch(e) {
      alert('Erro ao criar álbum.');
      console.error(e);
    } finally {
      btn.textContent = 'Criar Álbum';
      btn.disabled = false;
    }
  }

  /* ---- ADICIONAR FOTO ---- */
  function openAddPhoto() {
    if (!currentAlbumId) { alert('Selecione um álbum primeiro.'); return; }
    document.getElementById('photo-file').value    = '';
    document.getElementById('photo-caption').value = '';
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('modal-add-photo').classList.add('open');
  }

  async function uploadPhoto() {
    const fileInput = document.getElementById('photo-file');
    const caption   = document.getElementById('photo-caption').value.trim();
    const files     = fileInput ? Array.from(fileInput.files) : [];
    if (files.length === 0) { alert('Selecione pelo menos uma imagem.'); return; }

    const btn = document.getElementById('btn-save-photo');
    if (btn) { btn.textContent = `Enviando 0/${files.length}...`; btn.disabled = true; }

    let firstUrl = null;
    let uploaded = 0;
    let errors   = 0;

    for (const file of files) {
      try {
        const ext      = file.name.split('.').pop();
        const fileName = `album_${currentAlbumId}_${Date.now()}_${Math.random().toString(36).substr(2,5)}.${ext}`;

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
        await DB.post('photos', { url: publicUrl, caption, album_id: currentAlbumId });

        if (!firstUrl) firstUrl = publicUrl;
        uploaded++;
        if (btn) btn.textContent = `Enviando ${uploaded}/${files.length}...`;

      } catch(e) {
        console.error('Erro ao enviar:', file.name, e);
        errors++;
      }
    }

    // Atualiza capa do álbum se ainda não tiver
    if (firstUrl) {
      try {
        const albumPhotos = await DB.get('photos', `album_id=eq.${currentAlbumId}&order=created_at.asc&limit=1`);
        if (albumPhotos.length <= uploaded) {
          await DB.patch('albums', currentAlbumId, { cover_url: firstUrl });
        }
      } catch(e) {}
    }

    closeModal('modal-add-photo');

    if (errors > 0) {
      showToast(`${uploaded} foto(s) enviada(s), ${errors} erro(s).`);
    } else {
      showToast(`${uploaded} foto(s) adicionada(s)! 📷`);
    }

    await renderAlbumPhotos();

    if (btn) { btn.textContent = 'Enviar Foto'; btn.disabled = false; }
  }

  /* ---- LIGHTBOX (vitrine) ---- */
  function openLightbox(idx) {
    currentPhotoIndex = idx;
    updateLightbox();
    document.getElementById('modal-lightbox').classList.add('open');
  }

  function updateLightbox() {
    const p = currentPhotos[currentPhotoIndex];
    if (!p) return;

    document.getElementById('lightbox-img').src         = p.url;
    document.getElementById('lightbox-caption').textContent = p.caption || '';
    document.getElementById('lightbox-counter').textContent =
      (currentPhotoIndex + 1) + ' / ' + currentPhotos.length;

    viewingPhotoId = p.id;

    const delBtn = document.getElementById('btn-delete-photo');
    if (delBtn) delBtn.style.display = AUTH.isAdmin() ? 'inline-block' : 'none';

    // Mostra/oculta setas
    document.getElementById('btn-lightbox-prev').style.opacity = currentPhotoIndex === 0 ? '0.3' : '1';
    document.getElementById('btn-lightbox-next').style.opacity = currentPhotoIndex === currentPhotos.length - 1 ? '0.3' : '1';
  }

  function lightboxPrev() {
    if (currentPhotoIndex > 0) { currentPhotoIndex--; updateLightbox(); }
  }

  function lightboxNext() {
    if (currentPhotoIndex < currentPhotos.length - 1) { currentPhotoIndex++; updateLightbox(); }
  }

  async function deletePhoto() {
    if (!confirm('Excluir esta foto?')) return;
    try {
      await DB.delete('photos', viewingPhotoId);
      currentPhotos.splice(currentPhotoIndex, 1);
      if (currentPhotos.length === 0) {
        closeModal('modal-lightbox');
        await renderAlbumPhotos();
      } else {
        currentPhotoIndex = Math.min(currentPhotoIndex, currentPhotos.length - 1);
        updateLightbox();
        // Re-renderiza grid em background
        renderAlbumPhotos();
      }
      showToast('Foto excluída.');
    } catch(e) {
      alert('Erro ao excluir.');
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
