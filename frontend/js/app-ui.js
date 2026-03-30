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
      <div class="page-header"><div class="container"><h1>Eventos</h1><p>Encontre torneios para participar</p></div></div>
      <div class="container">
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
            <select class="form-control form-control-sm" id="filter-date" onchange="applyAdvancedFilters()">
              <option value="">Qualquer data</option>
              <option value="7">Próximos 7 dias</option>
              <option value="30">Próximos 30 dias</option>
              <option value="90">Próximos 3 meses</option>
            </select>
          </div>
        </div>
        <div class="events-grid" id="events-grid">
          ${cards || '<div class="empty-state" style="grid-column:1/-1"><p>Nenhum evento disponível</p></div>'}
        </div>
      </div>`;

    // Populate city filter
    const cities = [...new Set(events.map(e => e.arena_city).filter(Boolean))].sort();
    const citySelect = document.getElementById('filter-city');
    if (citySelect) cities.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; citySelect.appendChild(o); });

    // Store events data for advanced filtering
    window._homeEvents = events;
    bindFilters();
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
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><h1>Meus Eventos</h1><p>${myEvents.length} evento(s)</p></div>
            <a href="#/criar-evento" class="btn btn-primary btn-sm">+ Novo evento</a>
          </div>
        </div>
      </div>
      <div class="container">
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

// ── ADVANCED FILTERS ──
window.applyAdvancedFilters = function() {
  const events = window._homeEvents;
  if (!events) return;
  const cityVal = document.getElementById('filter-city')?.value || '';
  const priceVal = document.getElementById('filter-price')?.value || '';
  const dateVal = document.getElementById('filter-date')?.value || '';

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

    // Date filter
    let showDate = true;
    if (dateVal && eventDate) {
      const evDate = new Date(eventDate);
      const now = new Date();
      const diffDays = (evDate - now) / (1000 * 60 * 60 * 24);
      showDate = diffDays >= 0 && diffDays <= parseInt(dateVal);
    }

    card.style.display = (showMod && showCity && showPrice && showDate) ? '' : 'none';
  });
};

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
