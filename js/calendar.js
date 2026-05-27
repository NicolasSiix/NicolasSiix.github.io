/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   calendar.js — Calendário (usa array global "games")
   ============================================================ */

const CALENDAR = (() => {

  const MONTHS    = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const DAYS_ABBR = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth();

  function init() {
    document.getElementById('btn-prev-month').addEventListener('click', prevMonth);
    document.getElementById('btn-next-month').addEventListener('click', nextMonth);
  }

  function render() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Cabeçalho dias da semana
    DAYS_ABBR.forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-header';
      h.textContent = d;
      grid.appendChild(h);
    });

    const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const _t = new Date();
    const todayStr = _t.getFullYear() + '-' +
      String(_t.getMonth() + 1).padStart(2,'0') + '-' +
      String(_t.getDate()).padStart(2,'0');

    // Células vazias antes do primeiro dia
    for (let i = 0; i < firstDay; i++) {
      const e = document.createElement('div');
      e.className = 'cal-day empty';
      grid.appendChild(e);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = currentYear + '-' +
        String(currentMonth + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');

      const isToday  = dateStr === todayStr;
      const isPast   = dateStr < todayStr;

      const cell = document.createElement('div');
      cell.className = 'cal-day' + (isToday ? ' today' : '') + (isPast ? ' past' : '');

      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = d;
      cell.appendChild(dayNum);

      // Jogos neste dia
      const dayGames = games.filter(g => g.date === dateStr);
      dayGames.forEach(g => {
        const dot = document.createElement('div');
        dot.className = 'game-dot' + (isPast ? ' done' : '');
        dot.textContent = g.name.length > 12 ? g.name.substring(0, 12) + '…' : g.name;
        dot.title = g.name;
        dot.addEventListener('click', ev => {
          ev.stopPropagation();
          GAMES.openDetail(g.id);
        });
        cell.appendChild(dot);
      });

      if (dayGames.length === 1) {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => GAMES.openDetail(dayGames[0].id));
      }

      grid.appendChild(cell);
    }

    document.getElementById('month-title').textContent =
      MONTHS[currentMonth] + ' ' + currentYear;
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    render();
  }

  function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    render();
  }

  return { init, render };

})();
