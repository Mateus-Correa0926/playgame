// PlayGAME — UI Enhancements (app-ui.js)
// Overrides renderHome and renderDashboard to match JSX design system

// ── SKELETON CARDS ──
function buildSkeletonCards(n = 3) {
  return Array(n).fill('').map(() => `<div class="skeleton skel-card"></div>`).join('');
}

// ── ENHANCED HOME (ATLETA) ──
window.renderHome = async function(el) {
  const user = getUser();
  if (user?.role === 'organizador') return renderDashboard(el);

  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;

  try {
    const events = await apiFetch('/events');
    if (!events) return;

    const cards = events.map(e => buildEventCard(e)).join('');

    el.innerHTML = `
      <!-- Banner: Desktop 1100x280px / Mobile 100%x180px -->
      <div class="hero-banner">
        <img src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1100&h=280&fit=crop&q=80" alt="PlayGAME Banner">
        <div class="hero-banner-overlay">
          <div class="hero-banner-title">Encontre seu próximo torneio</div>
          <div class="hero-banner-sub">Eventos de vôlei, futevôlei e beach tennis na areia</div>
        </div>
      </div>
      <div class="filter-section">
        <div class="filter-bar">
          ${['Todos','Vôlei','Futevôlei','Beach Tennis'].map((f,i) => `<button class="filter-chip ${i===0?'active':''}" data-filter="${f}">${f}</button>`).join('')}
        </div>
        <div class="filter-advanced" id="filter-advanced">
          <div class="filter-row">
            <select class="form-control form-control-sm" id="filter-city" onchange="applyAdvancedFilters()">
              <option value="">Todos os locais</option>
            </select>
            <select class="form-control form-control-sm" id="filter-price" onchange="applyAdvancedFilters()">
              <option value="">Qualquer valor</option>
              <option value="0-50">Até R$ 50</option>
              <option value="50-100">R$ 50 — R$ 100</option>
              <option value="100-200">R$ 100 — R$ 200</option>
              <option value="200+">Acima de R$ 200</option>
            </select>
          </div>
          </div>
          <div class="filter-row" style="margin: 3vh 0;">
            <div class="date-picker-trigger" id="date-picker-trigger" onclick="toggleCalendarPopup()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span id="date-picker-label">Quando?</span>
            </div>
          </div>
          <div class="cal-popup" id="cal-popup" style="display:none">
            <div class="cal-popup-footer">
              <div class="cal-input-row">
                <div class="cal-input-group">
                  <label>De</label>
                  <div class="cal-input-wrap">
                    <input type="text" class="cal-date-input" id="cal-input-start" placeholder="dd/mm/aaaa" maxlength="10" oninput="calMaskDate(this)" onchange="calInputChanged()">
                    <button class="cal-input-clear" onclick="calClearInput('start')">&times;</button>
                  </div>
                </div>
                <div class="cal-input-group">
                  <label>Até</label>
                  <div class="cal-input-wrap">
                    <input type="text" class="cal-date-input" id="cal-input-end" placeholder="dd/mm/aaaa" maxlength="10" oninput="calMaskDate(this)" onchange="calInputChanged()">
                    <button class="cal-input-clear" onclick="calClearInput('end')">&times;</button>
                  </div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm cal-filter-btn" onclick="calApplyAndClose()">Filtrar</button>
            </div>
            <div id="pg-calendar-wrap"></div>
          </div>
        </div>
      </div>
      <div class="events-grid" id="events-grid">
        ${cards || '<div class="empty-state" style="grid-column:1/-1"><p>Nenhum evento disponível</p></div>'}
      </div>`;

    // Populate city filter
    const cities = [...new Set(events.map(e => e.arena_city).filter(Boolean))].sort();
    const citySelect = document.getElementById('filter-city');
    if (citySelect) cities.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; citySelect.appendChild(o); });

    // Store events data for advanced filtering
    window._homeEvents = events;
    bindFilters();
    initCalendarWidget();
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
};

// ── ENHANCED DASHBOARD (ORGANIZADOR) ──
window.renderDashboard = async function(el) {
  const user = getUser();
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;

  try {
    const [eventsAll, orgEvents] = await Promise.all([
      apiFetch('/events'),
      apiFetch('/events/organizer/mine').catch(() => null)
    ]);

    const myEvents = orgEvents || (eventsAll || []).filter(e => e.organizer_id === user?.id);
    const cards = myEvents.map(e => buildEventCard(e)).join('');

    el.innerHTML = `
      <!-- Banner: Desktop 1100x280px / Mobile 100%x180px -->
      <div class="hero-banner">
        <img src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1100&h=280&fit=crop&q=80" alt="PlayGAME Banner">
        <div class="hero-banner-overlay">
          <div class="hero-banner-title">Meus Eventos</div>
          <div class="hero-banner-sub">${myEvents.length} evento(s) criados</div>
        </div>
      </div>
      <div class="filter-section">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
          <a href="#/criar-evento" class="btn btn-primary btn-sm">+ Novo evento</a>
        </div>
        <div class="filter-bar">
          ${['Todos','Vôlei','Futevôlei','Beach Tennis'].map((f,i) => `<button class="filter-chip ${i===0?'active':''}" data-filter="${f}">${f}</button>`).join('')}
        </div>
        <div class="events-grid" id="events-grid">
          ${cards || `<div class="empty-state" style="grid-column:1/-1">
            <div class="empty-state-title">Nenhum evento criado</div>
            <p style="color:var(--gray-300);font-size:14px">Crie seu primeiro evento para começar.</p>
          </div>`}
        </div>
      </div>`;

    bindFilters();
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
};

// ── CALENDAR POPUP WIDGET ──
window._calState = { year: 0, month: 0, start: null, end: null, range: false };

window.initCalendarWidget = function() {
  const now = new Date();
  window._calState = { year: now.getFullYear(), month: now.getMonth(), start: null, end: null, range: false };
  renderCalendar();

  // Stop clicks inside the popup from bubbling to the document listener.
  // This prevents the popup from closing when inner elements are re-rendered
  // (detached from DOM) before the event reaches the document handler.
  const popupEl = document.getElementById('cal-popup');
  if (popupEl) popupEl.addEventListener('click', function(e) { e.stopPropagation(); });

  document.addEventListener('click', function(e) {
    const popup = document.getElementById('cal-popup');
    const trigger = document.getElementById('date-picker-trigger');
    if (popup && popup.style.display !== 'none' && !trigger.contains(e.target)) {
      popup.style.display = 'none';
    }
  });
};

window.toggleCalendarPopup = function() {
  const popup = document.getElementById('cal-popup');
  if (!popup) return;
  popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
  if (popup.style.display === 'block') renderCalendar();
};

function fmtBR(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
}
function parseBR(br) {
  const match = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, mo, y] = match;
  const dt = new Date(+y, +mo - 1, +d);
  if (dt.getDate() !== +d || dt.getMonth() !== +mo - 1) return null;
  return `${y}-${mo}-${d}`;
}

window.calMaskDate = function(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
  if (v.length > 5) v = v.slice(0,5) + '/' + v.slice(5,9);
  input.value = v;
};

window.calInputChanged = function() {
  const startInput = document.getElementById('cal-input-start');
  const endInput = document.getElementById('cal-input-end');
  const s = window._calState;
  const startISO = parseBR(startInput?.value || '');
  const endISO = parseBR(endInput?.value || '');
  if (startISO) s.start = startISO;
  if (endISO) { s.end = endISO; s.range = true; }
  renderCalendar();
};

window.calClearInput = function(which) {
  const s = window._calState;
  if (which === 'start') {
    s.start = null;
    const el = document.getElementById('cal-input-start');
    if (el) el.value = '';
  } else {
    s.end = null;
    const el = document.getElementById('cal-input-end');
    if (el) el.value = '';
  }
  renderCalendar();
};

window.updateCalInputs = function() {
  const { start, end } = window._calState;
  const si = document.getElementById('cal-input-start');
  const ei = document.getElementById('cal-input-end');
  if (si) si.value = fmtBR(start);
  if (ei) ei.value = fmtBR(end);
};

window.updateTriggerLabel = function() {
  const label = document.getElementById('date-picker-label');
  const trigger = document.getElementById('date-picker-trigger');
  if (!label) return;
  const { start, end } = window._calState;
  if (start && end) {
    label.textContent = `${fmtBR(start)} — ${fmtBR(end)}`;
    trigger.classList.add('has-value');
  } else if (start) {
    label.textContent = fmtBR(start);
    trigger.classList.add('has-value');
  } else {
    label.textContent = 'Quando?';
    trigger.classList.remove('has-value');
  }
};

window.renderCalendar = function() {
  const wrap = document.getElementById('pg-calendar-wrap');
  if (!wrap) return;
  const { year, month, start, end, range } = window._calState;
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const days = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  const first = new Date(year, month, 1);
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  let cells = '';
  for (let i = 0; i < startDay; i++) cells += '<div class="cal-cell cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let cls = 'cal-day';
    if (dateStr === todayStr) cls += ' cal-today';
    if (start && dateStr === start) cls += ' cal-selected cal-start';
    if (end && dateStr === end) cls += ' cal-selected cal-end';
    if (start && end && dateStr > start && dateStr < end) cls += ' cal-in-range';
    if (start && !end && dateStr === start) cls += ' cal-selected';
    cells += `<div class="cal-cell"><button class="${cls}" data-date="${dateStr}" onclick="calDayClick('${dateStr}')">${d}</button></div>`;
  }

  const hasSelection = start || end;

  wrap.innerHTML = `
    <div class="pg-calendar">
      <div class="cal-header">
        <button class="cal-nav" onclick="calNav(-1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="cal-month-year">${months[month]} ${year}</span>
        <button class="cal-nav" onclick="calNav(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
      <div class="cal-mode">
        <button class="cal-mode-btn ${!range?'active':''}" onclick="calSetMode(false)">Data</button>
        <button class="cal-mode-btn ${range?'active':''}" onclick="calSetMode(true)">Intervalo</button>
        ${hasSelection ? '<button class="cal-clear-btn" onclick="calClear()">Limpar</button>' : ''}
      </div>
      <div class="cal-weekdays">${days.map(d => `<div class="cal-wk">${d}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>`;

  updateCalInputs();
};

window.calNav = function(dir) {
  window._calState.month += dir;
  if (window._calState.month > 11) { window._calState.month = 0; window._calState.year++; }
  if (window._calState.month < 0) { window._calState.month = 11; window._calState.year--; }
  renderCalendar();
};

window.calSetMode = function(isRange) {
  window._calState.range = isRange;
  window._calState.start = null;
  window._calState.end = null;
  renderCalendar();
};

window.calDayClick = function(dateStr) {
  const s = window._calState;
  if (!s.range) {
    s.start = (s.start === dateStr) ? null : dateStr;
    s.end = null;
  } else {
    if (!s.start || (s.start && s.end)) {
      s.start = dateStr; s.end = null;
    } else {
      if (dateStr < s.start) { s.end = s.start; s.start = dateStr; }
      else if (dateStr === s.start) { s.start = null; }
      else { s.end = dateStr; }
    }
  }
  renderCalendar();
};

window.calClear = function() {
  window._calState.start = null;
  window._calState.end = null;
  renderCalendar();
  updateTriggerLabel();
  applyAdvancedFilters();
};

window.calApplyAndClose = function() {
  calInputChanged();
  updateTriggerLabel();
  applyAdvancedFilters();
  const popup = document.getElementById('cal-popup');
  if (popup) popup.style.display = 'none';
};

// ── ADVANCED FILTERS ──
window.applyAdvancedFilters = function() {
  const events = window._homeEvents;
  if (!events) return;
  const cityVal = document.getElementById('filter-city')?.value || '';
  const priceVal = document.getElementById('filter-price')?.value || '';
  const { start: dateStart, end: dateEnd } = window._calState;

  document.querySelectorAll('.event-card').forEach(card => {
    const modality = card.getAttribute('data-modality') || '';
    const city = card.getAttribute('data-city') || '';
    const fee = parseFloat(card.getAttribute('data-fee') || '0');
    const eventDate = card.getAttribute('data-date') || '';

    // Modality filter
    const activeChip = document.querySelector('.filter-chip.active');
    const modFilter = activeChip?.getAttribute('data-filter')?.toLowerCase() || 'todos';
    let showMod = modFilter === 'todos' || modality.includes(modFilter.split(' ')[0].toLowerCase());

    // City filter
    let showCity = !cityVal || city === cityVal;

    // Price filter
    let showPrice = true;
    if (priceVal === '0-50') showPrice = fee <= 50;
    else if (priceVal === '50-100') showPrice = fee > 50 && fee <= 100;
    else if (priceVal === '100-200') showPrice = fee > 100 && fee <= 200;
    else if (priceVal === '200+') showPrice = fee > 200;

    // Date range filter (from calendar widget)
    let showDate = true;
    if (eventDate && (dateStart || dateEnd)) {
      const evDateStr = eventDate.slice(0, 10);
      if (dateStart && !dateEnd) showDate = evDateStr === dateStart;
      else if (dateStart) showDate = evDateStr >= dateStart;
      if (showDate && dateEnd) showDate = evDateStr <= dateEnd;
    }

    card.style.display = (showMod && showCity && showPrice && showDate) ? '' : 'none';
  });
};

window.clearDateFilters = function() { calClear(); updateTriggerLabel(); };

// ── SHARE EVENT ──
window.shareEvent = async function(title, id) {
  const url = `${window.location.origin}/#/eventos/${id}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'PlayGAME — ' + title, url }); } catch (e) {}
  } else {
    await navigator.clipboard.writeText(url);
    toast('Link copiado!', 'success');
  }
};

// ── PULL TO REFRESH ──
(function pullToRefresh() {
  let startY = 0, indicator = null;
  document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', e => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 60 && window.scrollY === 0 && !indicator) {
      indicator = document.createElement('div');
      indicator.style.cssText = 'position:fixed;top:58px;left:50%;transform:translateX(-50%);background:var(--orange);color:#fff;padding:6px 16px;border-radius:0 0 20px 20px;font-size:.8rem;font-weight:700;z-index:99;letter-spacing:.05em';
      indicator.textContent = 'Solte para atualizar';
      document.body.appendChild(indicator);
    }
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    if (indicator) { indicator.remove(); indicator = null; }
    if (dy > 100 && window.scrollY === 0) {
      toast('Atualizando...', 'info');
      setTimeout(() => { renderPage(window.location.hash || '#/'); }, 400);
    }
  }, { passive: true });
})();
