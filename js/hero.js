/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   hero.js — Box de fotos rotativas no hero da home
   ============================================================ */

const HERO = (() => {

  const INTERVAL = 4000;   // tempo de cada foto (ms)
  let urls = [];
  let idx = 0;
  let timer = null;
  let layers = [];
  let activeLayer = 0;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function collectUrls() {
    // 1ª opção: fotos da galeria (operações)
    try {
      const photos = await DB.get('photos', 'order=created_at.desc&limit=80');
      const list = (photos || []).map(p => p.url).filter(Boolean);
      if (list.length) return list;
    } catch (e) { console.warn('[HERO] galeria indisponível:', e); }

    // Fallback: fotos de perfil dos membros
    try {
      const mem = await DB.get('members', 'order=created_at.asc');
      return (mem || []).map(m => m.photo_url).filter(Boolean);
    } catch (e) { console.warn('[HERO] membros indisponíveis:', e); }

    return [];
  }

  function preload(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function showNext() {
    if (urls.length < 2) return;
    idx = (idx + 1) % urls.length;
    const next = (activeLayer + 1) % 2;
    const nextEl = layers[next];

    nextEl.onload = () => {
      layers[activeLayer].classList.remove('is-active');
      nextEl.classList.add('is-active');
      activeLayer = next;
    };
    nextEl.src = urls[idx];
  }

  async function init() {
    const box = document.getElementById('hero-photos');
    if (!box) return;

    layers = [
      document.getElementById('hero-photo-a'),
      document.getElementById('hero-photo-b')
    ];
    if (!layers[0] || !layers[1]) return;

    urls = shuffle(await collectUrls());
    if (!urls.length) return;   // sem fotos: box continua escondida

    // Mostra a primeira foto só depois de carregar (evita "flash" vazio)
    const ok = await preload(urls[0]);
    if (!ok && urls.length > 1) { urls.shift(); }

    layers[0].src = urls[0];
    layers[0].classList.add('is-active');
    activeLayer = 0;
    box.style.display = 'block';

    if (urls.length > 1) {
      timer = setInterval(showNext, INTERVAL);
    }
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', HERO.init);
