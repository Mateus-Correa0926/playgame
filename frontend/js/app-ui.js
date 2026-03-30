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

  el.innerHTML = `<div class="stats-grid">${buildSkeletonCards(4)}</div>`;

  try {
    const [events, myRegs] = await Promise.all([
      apiFetch('/events'),
      apiFetch('/registrations/my').catch(() => [])
    ]);
    if (!events) return;

    const confirmedEvents = events.filter(e => e.status === 'confirmado').length;
    const pendingEvents = events.filter(e => e.status === 'pendente').length;
    const totalAthletes = events.reduce((a, e) => a + (parseInt(e.total_registered) || 0), 0);
    const myRegistrations = Array.isArray(myRegs) ? myRegs.length : 0;

    const cards = events.slice(0, 8).map(e => buildEventCard(e)).join('');

    el.innerHTML = `
      <div style="margin-bottom:24px">
        <h2 style="font-family:var(--font-display);font-size:28px;font-weight:900;text-transform:uppercase">
          Olá, ${user ? user.name.split(' ')[0] : 'Visitante'}!
        </h2>
        <p style="color:var(--gray-500);margin-top:4px">Aqui está seu resumo de hoje.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-orange"></div>
          <div><div class="stat-value">${myRegistrations}</div><div class="stat-label">Minhas Inscrições</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-military">✓</div>
          <div><div class="stat-value">${confirmedEvents}</div><div class="stat-label">Eventos Disponíveis</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-black"></div>
          <div><div class="stat-value">${totalAthletes}</div><div class="stat-label">Atletas na Plataforma</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-orange"></div>
          <div><div class="stat-value">${pendingEvents}</div><div class="stat-label">Em Andamento</div></div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Eventos Disponíveis</div>
        <a href="#/eventos" style="font-size:13px;color:var(--orange);text-decoration:none;font-weight:600">Ver todos</a>
      </div>
      ${events.length === 0
        ? `<div class="card" style="padding:24px"><div class="empty-state">
            <div class="empty-state-title">Nenhuma inscrição</div>
            <p style="color:var(--gray-300);font-size:14px">Explore os eventos disponíveis e se inscreva!</p>
          </div></div>`
        : `<div class="events-grid">${cards}</div>`
      }`;

  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
};

// ── ENHANCED DASHBOARD (ORGANIZADOR) ──
window.renderDashboard = async function(el) {
  const user = getUser();
  el.innerHTML = `<div class="stats-grid">${buildSkeletonCards(4)}</div>`;

  try {
    const [eventsAll, orgEvents, notifData] = await Promise.all([
      apiFetch('/events'),
      apiFetch('/events/organizer/mine').catch(() => null),
      apiFetch('/notifications').catch(() => ({ notifications: [], unread_count: 0 }))
    ]);

    const myEvents = orgEvents || (eventsAll || []).filter(e => e.organizer_id === user?.id);
    const totalInscritos = myEvents.reduce((a, e) => a + (parseInt(e.total_registered) || 0), 0);
    const confirmedCount = myEvents.filter(e => e.status === 'confirmado').length;
    const pendingCount = myEvents.filter(e => e.status === 'pendente').length;

    const cards = myEvents.slice(0, 4).map(e => buildEventCard(e)).join('');

    el.innerHTML = `
      <div style="margin-bottom:24px">
        <h2 style="font-family:var(--font-display);font-size:28px;font-weight:900;text-transform:uppercase">
          Olá, ${user?.name?.split(' ')[0]}!
        </h2>
        <p style="color:var(--gray-500);margin-top:4px">Aqui está seu resumo de hoje.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-orange"></div>
          <div><div class="stat-value">${myEvents.length}</div><div class="stat-label">Meus Eventos</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-military">✓</div>
          <div><div class="stat-value">${confirmedCount}</div><div class="stat-label">Confirmados</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-black"></div>
          <div><div class="stat-value">${totalInscritos}</div><div class="stat-label">Inscrições</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-orange"></div>
          <div><div class="stat-value">${pendingCount}</div><div class="stat-label">Pendentes Arena</div></div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Eventos Recentes</div>
        <a href="#/criar-evento" class="btn btn-primary btn-sm">+ Novo</a>
      </div>
      ${myEvents.length === 0
        ? `<div class="card" style="padding:24px"><div class="empty-state">
            <div class="empty-state-title">Nenhum evento criado</div>
            <p style="color:var(--gray-300);font-size:14px">Crie seu primeiro evento para começar.</p>
          </div></div>`
        : `<div class="events-grid">${cards}</div>`
      }`;

  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
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
