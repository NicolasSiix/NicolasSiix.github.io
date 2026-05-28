/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   auth.js — Login e controle de acesso do Admin
   ============================================================
   Para alterar a senha do admin, mude ADMIN_PASSWORD.
   Para alterar o usuário, mude ADMIN_USER.
   ============================================================ */

const AUTH = (() => {

  /* ---- CREDENCIAIS — altere aqui ---- */
  const ADMIN_USER     = 'admin';
  const ADMIN_PASSWORD = 'agulhas2025';
  const STORAGE_KEY    = 'an_admin_session';
  /* ------------------------------------ */

  let isAdminLoggedIn = false;

  function init() {
    // Restaura sessão salva no navegador
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
      isAdminLoggedIn = true;
    }

    document.getElementById('btn-admin-login').addEventListener('click', () => {
      document.getElementById('login-screen').classList.add('open');
      document.getElementById('login-user').focus();
    });

    document.getElementById('btn-admin-logout').addEventListener('click', logout);
    document.getElementById('btn-do-login').addEventListener('click', tryLogin);
    document.getElementById('login-pass').addEventListener('keydown', e => {
      if (e.key === 'Enter') tryLogin();
    });
    document.getElementById('login-screen').addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('open');
    });

    // Aplica estado inicial (logado ou não)
    updateAdminUI();
  }

  function tryLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const err  = document.getElementById('login-error');

    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
      isAdminLoggedIn = true;
      localStorage.setItem(STORAGE_KEY, 'true');
      document.getElementById('login-screen').classList.remove('open');
      document.getElementById('login-pass').value = '';
      document.getElementById('login-user').value = '';
      err.classList.remove('show');
      updateAdminUI();
      // Recarrega membros para mostrar pendentes e controles de admin
      if (typeof MEMBERS !== 'undefined') MEMBERS.render();
    } else {
      err.classList.add('show');
      document.getElementById('login-pass').value = '';
      document.getElementById('login-pass').focus();
    }
  }

  function logout() {
    isAdminLoggedIn = false;
    localStorage.removeItem(STORAGE_KEY);
    updateAdminUI();
    if (typeof MEMBERS !== 'undefined') MEMBERS.render();
  }

  function updateAdminUI() {
    const banners   = document.querySelectorAll('.admin-banner');
    const btnLogin  = document.getElementById('btn-admin-login');
    const btnLogout = document.getElementById('btn-admin-logout');
    const adminLabel = document.getElementById('admin-label');

    if (isAdminLoggedIn) {
      banners.forEach(b => b.style.display = 'flex');
      btnLogin.style.display   = 'none';
      btnLogout.style.display  = 'inline-block';
      if (adminLabel) adminLabel.style.display = 'inline';
    } else {
      banners.forEach(b => b.style.display = 'none');
      btnLogin.style.display   = 'inline-block';
      btnLogout.style.display  = 'none';
      if (adminLabel) adminLabel.style.display = 'none';
    }
  }

  function isAdmin() {
    return isAdminLoggedIn;
  }

  return { init, isAdmin };

})();
