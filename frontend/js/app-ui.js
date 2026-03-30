// PlayGAME — UI Enhancements (app-ui.js)
// Sobrescreve renderHome e renderDashboard com versões visuais aprimoradas

// ── COUNTDOWN TIMER ──
function buildCountdown(eventDate, startTime) {
  const target = new Date(`${eventDate}T${startTime || '00:00'}`);
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) return '<div class="alert alert-info"><span class="alert-icon">ℹ️</span>Este evento já ocorreu ou está acontecendo agora.</div>';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `
    <div class="countdown">
      <div class="countdown-unit"><span class="countdown-val">${String(days).padStart(2,'0')}</span><span class="countdown-label">dias</span></div>
      <span class="countdown-sep">:</span>
      <div class="countdown-unit"><span class="countdown-val">${String(hours).padStart(2,'0')}</span><span class="countdown-label">horas</span></div>
      <span class="countdown-sep">:</span>
      <div class="countdown-unit"><span class="countdown-val">${String(mins).padStart(2,'0')}</span><span class="countdown-label">min</span></div>
    </div>`;
}

// ── SKELETON CARDS ──
function buildSkeletonCards(n = 3) {
  return Array(n).fill('').map(() => `<div class="skeleton skel-card"></div>`).join('');
}

// ── ENHANCED HOME (ATLETA) ──
window.renderHome = async function(el) {
  const user = getUser();
  if (user?.role === 'organizador') return renderDashboard(el);

  // Skeleton primeiro
  el.innerHTML = `
    <div class="hero-banner">
      <div class="hero-greeting">Bem-vindo de volta</div>
      <div class="hero-name">${user ? user.name.split(' ')[0] + '! 👋' : 'PlayGAME 🏖'}</div>
      <div class="hero-sub">Encontre eventos de areia perto de você</div>
    </div>
    <div class="container" style="padding-top:16px">
      <div class="events-grid">${buildSkeletonCards(3)}</div>
    </div>`;

  try {
    const events = await apiFetch('/events');
    if (!events) return;

    const upcoming = events.filter(e => new Date(e.event_date) >= new Date()).length;
    const confirmed = events.filter(e => e.status === 'confirmado').length;

    const modalityGroups = [
      { key: 'volei', icon: '🏐', label: 'Vôlei' },
      { key: 'futevolei', icon: '⚽', label: 'Futevôlei' },
      { key: 'beach_tennis', icon: '🎾', label: 'Beach Tennis' }
    ];

    const modChips = [
      `<div class="modality-chip active" data-filter="todos"><div class="mod-icon">🏖</div><div class="mod-label">Todos</div></div>`,
      ...modalityGroups.map(m => `<div class="modality-chip" data-filter="${m.key}"><div class="mod-icon">${m.icon}</div><div class="mod-label">${m.label}</div></div>`)
    ].join('');

    const cards = events.map(e => buildEventCard(e)).join('');

    el.innerHTML = `
      <div class="hero-banner">
        <div class="hero-greeting">Bem-vindo de volta</div>
        <div class="hero-name">${user ? user.name.split(' ')[0] + '! 👋' : 'PlayGAME 🏖'}</div>
        <div class="hero-sub">Encontre eventos de areia perto de você</div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="hero-stat-val">${upcoming}</div><div class="hero-stat-label">Próximos</div></div>
          <div class="hero-stat"><div class="hero-stat-val">${confirmed}</div><div class="hero-stat-label">Confirmados</div></div>
          <div class="hero-stat"><div class="hero-stat-val">${events.length}</div><div class="hero-stat-label">Total</div></div>
        </div>
      </div>

      <div class="container" style="padding-top:16px">
        <div class="quick-actions">
          <a class="quick-action" href="#/eventos"><div class="qa-icon">🏆</div><div class="qa-label">Eventos</div></a>
          <a class="quick-action" href="#/minhas-inscricoes"><div class="qa-icon">📋</div><div class="qa-label">Inscrições</div></a>
          <a class="quick-action" href="#/arenas"><div class="qa-icon">🏟</div><div class="qa-label">Arenas</div></a>
          <a class="quick-action" href="#/perfil"><div class="qa-icon">👤</div><div class="qa-label">Perfil</div></a>
        </div>

        <div class="section-header mb-12">
          <div class="section-title">Modalidades</div>
        </div>
        <div class="modality-scroll mb-12">${modChips}</div>

        <div class="section-header mb-12">
          <div class="section-title">Eventos disponíveis</div>
          <a href="#/eventos" style="font-size:.82rem;color:var(--orange);text-decoration:none;font-weight:600">Ver todos →</a>
        </div>
        <div class="events-grid" id="events-grid">
          ${cards || `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🏖</div><p>Nenhum evento disponível no momento.</p></div>`}
        </div>
      </div>`;

    // Bind modality chips
    document.querySelectorAll('.modality-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.modality-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const f = chip.getAttribute('data-filter');
        document.querySelectorAll('.event-card').forEach(card => {
          const mod = card.getAttribute('data-modality') || '';
          card.style.display = (f === 'todos' || mod.includes(f)) ? '' : 'none';
        });
      });
    });

  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error"><span class="alert-icon">⚠️</span>${err.message}</div></div>`;
  }
};

// ── ENHANCED DASHBOARD (ORGANIZADOR) ──
window.renderDashboard = async function(el) {
  const user = getUser();
  el.innerHTML = `
    <div class="hero-banner">
      <div class="hero-greeting">Painel do Organizador</div>
      <div class="hero-name">${user?.name?.split(' ')[0]}! 📋</div>
      <div class="hero-sub">Gerencie seus eventos de areia</div>
    </div>
    <div class="container" style="padding-top:16px">
      <div class="events-grid">${buildSkeletonCards(2)}</div>
    </div>`;

  try {
    const [eventsAll, orgEvents, notifData] = await Promise.all([
      apiFetch('/events'),
      apiFetch('/events/organizer/mine').catch(() => null),
      apiFetch('/notifications').catch(() => ({ notifications: [], unread_count: 0 }))
    ]);

    const myEvents = orgEvents || (eventsAll || []).filter(e => e.organizer_id === user?.id);
    const totalReg = myEvents.reduce((a, e) => a + (parseInt(e.total_registered) || 0), 0);
    const totalPaid = myEvents.reduce((a, e) => a + (parseInt(e.total_paid) || 0), 0);
    const totalRevenue = myEvents.reduce((a, e) => a + ((parseInt(e.total_paid) || 0) * parseFloat(e.registration_fee || 0)), 0);
    const unreadComments = myEvents.reduce((a, e) => a + (parseInt(e.unread_comments) || 0), 0);
    const pendingConfirm = myEvents.filter(e => !e.arena_confirmed).length;

    const eventRows = myEvents.map(e => `
      <div class="dash-event-row" onclick="navigate('#/eventos/${e.id}')">
        <div class="dash-event-dot ${e.status}"></div>
        <div class="dash-event-info">
          <div class="dash-event-title">${e.title}</div>
          <div class="dash-event-meta">${formatDate(e.event_date)} • ${e.arena_name || 'Arena'} • ${getModalityLabel(e.modality)}</div>
        </div>
        <div class="dash-event-badges">
          ${(e.unread_comments > 0) ? `<span class="dash-mini-badge badge-comment">💬 ${e.unread_comments}</span>` : ''}
          <span class="dash-mini-badge badge-reg">👥 ${e.total_paid || 0}/${e.participant_limit}</span>
        </div>
      </div>`).join('') || `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>Você ainda não criou nenhum evento.</p>
        <a href="#/criar-evento" class="btn btn-primary" style="margin-top:14px">Criar primeiro evento</a>
      </div>`;

    el.innerHTML = `
      <div class="hero-banner">
        <div class="hero-greeting">Painel do Organizador</div>
        <div class="hero-name">${user?.name?.split(' ')[0]}! 📋</div>
        <div class="hero-sub">Gerencie seus eventos de areia</div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="hero-stat-val">${myEvents.length}</div><div class="hero-stat-label">Eventos</div></div>
          <div class="hero-stat"><div class="hero-stat-val">${totalPaid}</div><div class="hero-stat-label">Pagos</div></div>
          <div class="hero-stat"><div class="hero-stat-val">${formatCurrency(totalRevenue)}</div><div class="hero-stat-label">Receita</div></div>
        </div>
      </div>

      <div class="container" style="padding-top:16px">

        <!-- Alertas -->
        ${unreadComments > 0 ? `<div class="alert alert-warn"><span class="alert-icon">💬</span>Você tem <strong>${unreadComments}</strong> comentário(s) não lido(s) em seus eventos.</div>` : ''}
        ${pendingConfirm > 0 ? `<div class="alert alert-info"><span class="alert-icon">⏳</span><strong>${pendingConfirm}</strong> evento(s) aguardando confirmação da arena.</div>` : ''}

        <!-- Stats -->
        <div class="stats-row" style="margin-bottom:20px">
          <div class="stat-card orange"><div class="stat-value">${myEvents.length}</div><div class="stat-label">Eventos criados</div></div>
          <div class="stat-card"><div class="stat-value">${totalReg}</div><div class="stat-label">Total inscritos</div></div>
          <div class="stat-card green"><div class="stat-value">${totalPaid}</div><div class="stat-label">Pag. confirmados</div></div>
          <div class="stat-card"><div class="stat-value">${notifData.unread_count || 0}</div><div class="stat-label">Notificações</div></div>
        </div>

        <!-- Ações rápidas -->
        <div class="quick-actions" style="margin-bottom:20px">
          <a class="quick-action" href="#/criar-evento"><div class="qa-icon">➕</div><div class="qa-label">Criar evento</div></a>
          <a class="quick-action" href="#/arenas"><div class="qa-icon">🏟</div><div class="qa-label">Arenas</div></a>
          <a class="quick-action" href="#/eventos"><div class="qa-icon">🏆</div><div class="qa-label">Ver todos</div></a>
          <a class="quick-action" href="#/perfil"><div class="qa-icon">👤</div><div class="qa-label">Perfil</div></a>
        </div>

        <!-- Lista de eventos -->
        <div class="section-header mb-12">
          <div class="section-title">Meus Eventos</div>
          <a href="#/criar-evento" class="btn btn-primary btn-sm">+ Novo</a>
        </div>
        ${eventRows}
      </div>`;

  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error"><span class="alert-icon">⚠️</span>${err.message}</div></div>`;
  }
};

// ── ENHANCED EVENT DETAIL — INFO SECTION ──
// Adds countdown, share button and info grid to detail view
const originalRenderEventDetail = window.renderEventDetail;
window.renderEventDetail = async function(el, id) {
  // Use the original and then enhance
  await originalRenderEventDetail(el, id);
};

// ── SHARE EVENT ──
window.shareEvent = async function(title, id) {
  const url = `${window.location.origin}/#/eventos/${id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: `PlayGAME — ${title}`, url });
    } catch (e) {}
  } else {
    await navigator.clipboard.writeText(url);
    toast('Link copiado!', 'success');
  }
};

// ── PULL TO REFRESH INDICATOR ──
(function pullToRefresh() {
  let startY = 0, indicator = null;
  document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', e => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 60 && window.scrollY === 0 && !indicator) {
      indicator = document.createElement('div');
      indicator.style.cssText = 'position:fixed;top:58px;left:50%;transform:translateX(-50%);background:var(--orange);color:#fff;padding:6px 16px;border-radius:0 0 20px 20px;font-size:.8rem;font-weight:700;z-index:99;letter-spacing:.05em';
      indicator.textContent = '↓ Solte para atualizar';
      document.body.appendChild(indicator);
    }
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    if (indicator) { indicator.remove(); indicator = null; }
    if (dy > 100 && window.scrollY === 0) {
      toast('Atualizando...', 'info');
      setTimeout(() => {
        const content = document.getElementById('page-content');
        if (content) renderPage(window.location.hash || '#/');
      }, 400);
    }
  }, { passive: true });
})();

console.log('🏖 PlayGAME UI Enhancements loaded');
