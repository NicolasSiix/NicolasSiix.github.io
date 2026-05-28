/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   app.js — Inicialização e navegação
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  AUTH.init();
  CALENDAR.init();
  GAMES.init();
  MEMBERS.init();
  PHOTOS.init();
  ABOUT.init();

  // Carrega dados do banco
  try { games   = await DB.get('games',   'order=date.asc');        } catch(e) { console.error(e); }
  try { members = await DB.get('members', 'order=created_at.asc');  } catch(e) { console.error(e); }

  // Renderiza estado inicial
  GAMES.updateStats();
  CALENDAR.render();
  MEMBERS.renderFromMemory();

  // Navegação
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('page-' + page).classList.add('active');

      if (page === 'games')    await GAMES.renderList();
      if (page === 'members')  await MEMBERS.render();
      if (page === 'calendar') CALENDAR.render();
      if (page === 'photos')   await PHOTOS.render();
      if (page === 'about')    await ABOUT.render();
    });
  });

});
