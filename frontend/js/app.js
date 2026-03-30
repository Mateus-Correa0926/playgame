// PlayGAME — Frontend App (app.js)
const API = '/api';
let currentUser = null;
let socket = null;
let notifCount = 0;

// ── UTILS ──
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function getToken() { return localStorage.getItem('pg_token'); }
function getUser() { return JSON.parse(localStorage.getItem('pg_user') || 'null'); }
function setAuth(token, user) { localStorage.setItem('pg_token', token); localStorage.setItem('pg_user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('pg_token'); localStorage.removeItem('pg_user'); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { clearAuth(); window.location.hash = '#/login'; return null; }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Erro na requisição');
  return data;
}

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDate(d) {
  if (!d) return '';
  const str = String(d).slice(0, 10);
  return new Date(str + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatCurrency(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function avatarInitials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getModalityLabel(key) {
  const map = {
    volei_dupla_masculino: 'Vôlei Dupla ♂', volei_dupla_feminino: 'Vôlei Dupla ♀',
    volei_dupla_misto: 'Vôlei Dupla ⚥', volei_4x4_masculino: 'Vôlei 4x4 ♂',
    volei_4x4_feminino: 'Vôlei 4x4 ♀', volei_4x4_misto: 'Vôlei 4x4 ⚥',
    futevolei_masculino: 'Futevôlei ♂', futevolei_feminino: 'Futevôlei ♀',
    futevolei_misto: 'Futevôlei ⚥',
    beach_tennis_1x1_masculino: 'Beach Tennis 1x1 ♂', beach_tennis_1x1_feminino: 'Beach Tennis 1x1 ♀',
    beach_tennis_2x2_masculino: 'Beach Tennis 2x2 ♂', beach_tennis_2x2_feminino: 'Beach Tennis 2x2 ♀',
    beach_tennis_2x2_misto: 'Beach Tennis 2x2 ⚥'
  };
  return map[key] || key;
}

const MODALITIES = [
  'volei_dupla_masculino','volei_dupla_feminino','volei_dupla_misto',
  'volei_4x4_masculino','volei_4x4_feminino','volei_4x4_misto',
  'futevolei_masculino','futevolei_feminino','futevolei_misto',
  'beach_tennis_1x1_masculino','beach_tennis_1x1_feminino',
  'beach_tennis_2x2_masculino','beach_tennis_2x2_feminino','beach_tennis_2x2_misto'
];

// ── SOCKET.IO ──
function initSocket() {
  if (typeof io === 'undefined') return;
  socket = io();
  socket.on('registration_update', () => loadNotifs());
  socket.on('comment_update', () => loadNotifs());
  socket.on('payment_update', () => loadNotifs());
}

// ── ROUTER ──
const routes = {};
function route(hash, fn) { routes[hash] = fn; }

function navigate(hash) { window.location.hash = hash; }

window.addEventListener('hashchange', render);
window.addEventListener('load', render);

function render() {
  const hash = window.location.hash || '#/';
  const user = getUser();
  currentUser = user;

  // Auth guard
  const publicRoutes = ['#/login', '#/register', '#/'];
  if (!user && !publicRoutes.some(r => hash.startsWith(r))) {
    return navigate('#/login');
  }

  const mainApp = $('#main-app');
  const authPages = $('#auth-pages');

  if (hash.startsWith('#/login') || hash.startsWith('#/register')) {
    mainApp.style.display = 'none';
    authPages.style.display = 'block';
    renderAuthPage(hash);
    return;
  }

  mainApp.style.display = 'block';
  authPages.style.display = 'none';
  updateNav();
  renderPage(hash);
}

function updateNav() {
  const user = getUser();
  if (!user) return;

  // Avatar in topbar
  const avatarEl = $('#nav-avatar');
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="">`;
    } else {
      avatarEl.textContent = avatarInitials(user.name);
    }
  }

  // Topbar title based on hash
  const hash = window.location.hash;
  const titleEl = $('#topbar-title');
  if (titleEl) {
    const titleMap = {
      '#/': user.role === 'organizador' ? 'Meus Eventos' : 'Eventos',
      '#/criar-evento': 'Novo Evento',
      '#/minhas-inscricoes': 'Minhas Inscrições',
      '#/convites': 'Convites',
      '#/perfil': 'Meu Perfil',
      '#/arenas': 'Arenas',
      '#/dashboard': 'Dashboard',
      '#/atletas': 'Atletas',
      '#/configuracoes': 'Configurações',
      '#/busca': 'Buscar',
    };
    titleEl.textContent = titleMap[hash] || (hash.startsWith('#/eventos/') ? 'Evento' : 'PlayGAME');
  }

  // Sidebar nav
  updateSidebar(user);

  // Bottom nav active
  $$('.bottom-nav-item').forEach(el => {
    const href = el.getAttribute('data-href') || '';
    el.classList.toggle('active', hash.startsWith(href) && href !== '');
  });

  // Close sidebar on mobile after navigation
  const sidebar = $('#sidebar');
  const backdrop = $('#sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function updateSidebar(user) {
  const hash = window.location.hash;
  const navEl = $('#sidebar-nav');
  const footerEl = $('#sidebar-footer');
  if (!navEl || !footerEl) return;

  const isOrg = user.role === 'organizador';
  const navItems = isOrg ? `
    <div class="nav-section-title">Principal</div>
    <a class="nav-item ${hash === '#/' || hash === '#/dashboard' ? 'active' : ''}" href="#/">Início</a>
    <a class="nav-item ${hash === '#/criar-evento' ? 'active' : ''}" href="#/criar-evento">Novo Evento</a>
    <div class="nav-section-title">Gerenciar</div>
    <a class="nav-item ${hash === '#/arenas' ? 'active' : ''}" href="#/arenas">Arenas</a>
    <a class="nav-item ${hash === '#/atletas' ? 'active' : ''}" href="#/atletas">Atletas</a>
    <div class="nav-section-title">Conta</div>
    <a class="nav-item ${hash === '#/perfil' ? 'active' : ''}" href="#/perfil">Perfil</a>
    <a class="nav-item ${hash === '#/configuracoes' ? 'active' : ''}" href="#/configuracoes">Configurações</a>
  ` : `
    <div class="nav-section-title">Principal</div>
    <a class="nav-item ${hash === '#/' || hash === '' ? 'active' : ''}" href="#/">Início</a>
    <div class="nav-section-title">Minha Conta</div>
    <a class="nav-item ${hash === '#/minhas-inscricoes' ? 'active' : ''}" href="#/minhas-inscricoes">Inscrições</a>
    <a class="nav-item ${hash === '#/convites' ? 'active' : ''}" href="#/convites">Convites</a>
    <a class="nav-item ${hash === '#/perfil' ? 'active' : ''}" href="#/perfil">Perfil</a>
    <a class="nav-item ${hash === '#/configuracoes' ? 'active' : ''}" href="#/configuracoes">Configurações</a>
  `;

  navEl.innerHTML = navItems;
  footerEl.innerHTML = `
    <div class="sidebar-user">
      <div class="avatar">${user.avatar ? `<img src="${user.avatar}" alt="">` : avatarInitials(user.name)}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${user.name}</div>
        <div class="sidebar-user-role">${user.role}</div>
      </div>
    </div>
    <button class="nav-item" id="logout-btn" style="color:var(--gray-500)">Sair</button>
  `;
}

function renderPage(hash) {
  const content = $('#page-content');
  if (!content) return;

  if (hash === '#/' || hash === '#') return renderHome(content);
  if (hash.startsWith('#/eventos/')) {
    const id = hash.split('/')[2];
    return renderEventDetail(content, id);
  }
  if (hash === '#/eventos') return renderHome(content);
  if (hash === '#/criar-evento') return renderCreateEvent(content);
  if (hash === '#/minhas-inscricoes') return renderMyRegistrations(content);
  if (hash === '#/convites') return renderMyInvites(content);
  if (hash.startsWith('#/convite/')) {
    const token = hash.split('/')[2];
    return renderInvitePage(content, token);
  }
  if (hash === '#/perfil') return renderProfile(content);
  if (hash === '#/arenas') return renderArenas(content);
  if (hash === '#/dashboard') return renderDashboard(content);

  content.innerHTML = `<div class="container"><div class="empty-state"><p>Página não encontrada.</p></div></div>`;
}

// ── AUTH PAGES ──
function renderAuthPage(hash) {
  const el = $('#auth-pages');
  if (hash.startsWith('#/register')) return el.innerHTML = buildRegisterPage();
  el.innerHTML = buildLoginPage();
  bindLoginForm();
}

function buildLoginPage() {
  return `<div class="auth-page">
    <div class="auth-logo">PLAY<span>GAME</span></div>
    <div class="auth-subtitle">Eventos Esportivos de Areia</div>
    <div class="auth-card">
      <h2 style="font-size:1.5rem;margin-bottom:20px">Entrar na conta</h2>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-control" id="login-email" placeholder="seu@email.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" class="form-control" id="login-pass" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="login-btn">Entrar</button>
      </form>
      <div class="auth-link">Não tem conta? <a href="#/register">Cadastre-se</a></div>
      <div class="auth-link" style="margin-top:8px;font-size:.75rem;color:var(--text-muted)">
        Demo: organizador@playgame.com / password
      </div>
    </div>
  </div>`;
}

function bindLoginForm() {
  const form = $('#login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-btn');
    btn.disabled = true; btn.textContent = 'Entrando...';
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: $('#login-email').value, password: $('#login-pass').value })
      });
      if (data) {
        setAuth(data.token, data.user);
        initSocket();
        navigate('#/');
        toast('Bem-vindo, ' + data.user.name + '!', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  });
}

function buildRegisterPage() {
  const modalitiesOptions = MODALITIES.map(m => `<option value="${m}">${getModalityLabel(m)}</option>`).join('');
  return `<div class="auth-page" style="padding-top:32px;padding-bottom:32px">
    <div class="auth-logo">PLAY<span>GAME</span></div>
    <div class="auth-subtitle">Crie sua conta</div>
    <div class="auth-card" style="max-width:460px">
      <div class="role-selector" id="role-selector">
        <div class="role-option selected" data-role="atleta">
          <div class="role-icon">A</div>
          <div class="role-label">Atleta</div>
          <div class="role-desc">Me inscrevo em eventos</div>
        </div>
        <div class="role-option" data-role="organizador">
          <div class="role-icon">O</div>
          <div class="role-label">Organizador</div>
          <div class="role-desc">Crio e gerencio eventos</div>
        </div>
      </div>
      <input type="hidden" id="reg-role" value="atleta">
      <form id="register-form">
        <div class="form-group">
          <label class="form-label">Nome completo</label>
          <input type="text" class="form-control" id="reg-name" placeholder="Seu nome" required>
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-control" id="reg-email" placeholder="seu@email.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <input type="tel" class="form-control" id="reg-phone" placeholder="(11) 99999-9999">
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" class="form-control" id="reg-pass" placeholder="Mínimo 6 caracteres" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="reg-btn">Criar conta</button>
      </form>
      <div class="auth-link">Já tem conta? <a href="#/login">Entrar</a></div>
    </div>
  </div>`;
}

document.addEventListener('click', async (e) => {
  // Role selector
  const roleOpt = e.target.closest('.role-option');
  if (roleOpt && roleOpt.closest('#role-selector')) {
    $$('.role-option').forEach(o => o.classList.remove('selected'));
    roleOpt.classList.add('selected');
    const roleInput = $('#reg-role');
    if (roleInput) roleInput.value = roleOpt.getAttribute('data-role');
  }

  // Register form submit
  const regBtn = e.target.closest('#reg-btn');
  if (regBtn) {
    e.preventDefault();
    const form = $('#register-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    regBtn.disabled = true; regBtn.textContent = 'Criando...';
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: $('#reg-name').value,
          email: $('#reg-email').value,
          phone: $('#reg-phone').value,
          password: $('#reg-pass').value,
          role: $('#reg-role').value
        })
      });
      if (data) {
        setAuth(data.token, data.user);
        initSocket();
        navigate('#/');
        toast('Conta criada! Bem-vindo(a)!', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally { if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Criar conta'; } }
  }

  // Logout
  if (e.target.closest('#logout-btn')) {
    clearAuth();
    navigate('#/login');
    toast('Você saiu da conta.');
  }

  // Notif bell
  if (e.target.closest('#notif-bell')) {
    toggleNotifPanel();
  }

  // Close notif panel
  if (!e.target.closest('#notif-bell') && !e.target.closest('#notif-panel')) {
    const panel = $('#notif-panel');
    if (panel) panel.remove();
  }
});

// ── NOTIFICATIONS ──
async function loadNotifs() {
  if (!getToken()) return;
  try {
    const data = await apiFetch('/notifications');
    if (!data) return;
    notifCount = data.unread_count;
    const badge = $('#notif-badge');
    if (badge) { badge.textContent = notifCount; badge.style.display = notifCount > 0 ? 'flex' : 'none'; }
  } catch (e) {}
}

function toggleNotifPanel() {
  const existing = $('#notif-panel');
  if (existing) { existing.remove(); return; }
  renderNotifPanel();
}

async function renderNotifPanel() {
  const data = await apiFetch('/notifications');
  if (!data) return;

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.className = 'notif-panel';
  const items = data.notifications.length > 0
    ? data.notifications.slice(0, 8).map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="navigate('#/eventos/${n.event_id}')">
        <div class="notif-item-title">${n.title}</div>
        <div class="notif-item-msg">${n.message}</div>
        <div class="notif-item-time">${timeAgo(n.created_at)}</div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.85rem">Sem notificações</div>';

  panel.innerHTML = `
    <div class="notif-panel-header">
      <h3>Notificações</h3>
      <button class="btn btn-ghost btn-sm" onclick="markAllRead()">Marcar todas</button>
    </div>
    ${items}`;
  document.body.appendChild(panel);
}

async function markAllRead() {
  await apiFetch('/notifications/read-all', { method: 'PUT' });
  const panel = $('#notif-panel');
  if (panel) panel.remove();
  loadNotifs();
}

// ── HOME ──
async function renderHome(el) {
  const user = getUser();
  if (user?.role === 'organizador') return renderDashboard(el);

  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const events = await apiFetch('/events');
    if (!events) return;
    el.innerHTML = buildHomeHTML(events, user);
    bindFilters();
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon"></div><p>${err.message}</p></div></div>`;
  }
}

function buildHomeHTML(events, user) {
  const cards = events.map(e => buildEventCard(e)).join('');

  return `
    <div class="page-header"><div class="container"><h1>Eventos</h1><p>Encontre torneios para participar</p></div></div>
    <div class="container">
      <div class="filter-bar">${['Todos','Vôlei','Futevôlei','Beach Tennis'].map((f,i) => `<button class="filter-chip ${i===0?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>
      <div class="events-grid" id="events-grid">
        ${cards || `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-title">Nenhum evento disponível</div></div>`}
      </div>
    </div>`;
}

function buildEventCard(e) {
  const status = e.status || 'pendente';
  const paid = parseInt(e.total_paid) || 0;
  const limit = parseInt(e.participant_limit) || 0;
  const pctFull = limit > 0 ? Math.min(100, Math.round(paid / limit * 100)) : 0;
  const statusMap = {
    confirmado: { cls: 'badge-confirmed', text: '✓ Confirmado' },
    pendente: { cls: 'badge-pending', text: 'Pendente' },
    cancelado: { cls: 'badge-rejected', text: '✕ Rejeitado' },
    encerrado: { cls: 'badge-rejected', text: 'Encerrado' },
  };
  const st = statusMap[status] || { cls: 'badge-pending', text: status };

  return `
    <div class="event-card" data-modality="${e.modality}" data-city="${e.arena_city||''}" data-fee="${e.registration_fee||0}" data-date="${(e.event_date||'').toString().slice(0,10)}" onclick="navigate('#/eventos/${e.id}')">
      <div class="event-card-header">
        ${e.banner ? `<img src="${e.banner}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1">` : ''}
        <div class="event-card-header-content">
          <span class="event-modality-badge">${getModalityLabel(e.modality)}</span>
        </div>
      </div>
      <div class="event-card-body">
        <div class="event-card-title">${e.title}</div>
        <div class="event-meta">
          <div class="event-meta-item">${formatDate(e.event_date)}${e.start_time ? ' • ' + (e.start_time||'').slice(0,5) : ''}</div>
          <div class="event-meta-item">${e.arena_name || 'Arena'}${e.arena_city ? ', ' + e.arena_city : ''}</div>
          <div class="event-meta-item">${paid} / ${limit} times</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pctFull}%"></div></div>
        <div style="font-size:11px;color:var(--gray-300);margin-top:4px;text-align:right">${pctFull}% preenchido</div>
      </div>
      <div class="event-card-footer" style="padding:14px 20px 16px">
        <div>
          <span class="event-price-label">Inscrição</span>
          <span class="event-price">${formatCurrency(e.registration_fee)}</span>
        </div>
        <span class="badge ${st.cls}">${st.text}</span>
      </div>
    </div>`;
}

function bindFilters() {
  $$('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.getAttribute('data-filter').toLowerCase();
      $$('.event-card').forEach(card => {
        const mod = card.getAttribute('data-modality') || '';
        const show = f === 'todos' || mod.includes(f.split(' ')[0].toLowerCase());
        card.style.display = show ? '' : 'none';
      });
    });
  });
}

// ── EVENT DETAIL ──
async function renderEventDetail(el, id) {
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const ev = await apiFetch(`/events/${id}`);
    if (!ev) return;
    const user = getUser();
    const isOrg = user?.role === 'organizador';
    const isOwner = isOrg && user?.id === ev.organizer_id;
    const myReg = ev.pending_registrations?.find(r => r.athlete_id === user?.id)
               || ev.paid_registrations?.find(r => r.athlete_id === user?.id);

    el.innerHTML = buildEventDetailHTML(ev, user, isOwner, myReg);
    bindEventDetailActions(ev, user, myReg);
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon"></div><p>${err.message}</p></div></div>`;
  }
}

function buildEventDetailHTML(ev, user, isOwner, myReg) {
  const paid = ev.paid_registrations || [];
  const pending = ev.pending_registrations || [];
  const comments = ev.comments || [];

  const paidList = paid.map(r => `
    <div class="athlete-item">
      <div class="athlete-avatar">${r.athlete_avatar ? `<img src="${r.athlete_avatar}">` : avatarInitials(r.athlete_name)}</div>
      <div class="athlete-info">
        <div class="athlete-name">${r.athlete_name}</div>
        <div class="athlete-sub">${r.team_name || r.partner_name || 'Individual'}</div>
      </div>
      <span class="athlete-status-badge badge-paid">✓ Pago</span>
      ${isOwner ? `<button class="btn btn-sm btn-ghost" onclick="confirmPayment(${r.id})">✓</button>` : ''}
    </div>`).join('') || '<p class="text-muted" style="text-align:center;padding:12px">Nenhum pagamento confirmado ainda.</p>';

  const pendingList = pending.map(r => `
    <div class="athlete-item">
      <div class="athlete-avatar">${r.athlete_avatar ? `<img src="${r.athlete_avatar}">` : avatarInitials(r.athlete_name)}</div>
      <div class="athlete-info">
        <div class="athlete-name">${r.athlete_name}</div>
        <div class="athlete-sub">${r.team_name || r.partner_name || 'Individual'}</div>
      </div>
      <span class="athlete-status-badge badge-pending">Pendente</span>
      ${isOwner ? `<button class="btn btn-sm btn-secondary" onclick="confirmPayment(${r.id})">Confirmar</button>` : ''}
    </div>`).join('') || '<p class="text-muted" style="text-align:center;padding:12px">Nenhuma inscrição pendente.</p>';

  const commentsList = comments.map(c => `
    <div class="comment-item">
      <div class="comment-avatar">${c.user_avatar ? `<img src="${c.user_avatar}">` : avatarInitials(c.user_name)}</div>
      <div class="comment-bubble ${c.user_role==='organizador'?'org':''}">
        <div class="comment-meta"><strong>${c.user_name}</strong><span>${timeAgo(c.created_at)}</span>${c.user_role==='organizador'?'<span class="status-pill status-confirmado" style="font-size:.65rem">Organizador</span>':''}</div>
        <div class="comment-text">${c.message}</div>
      </div>
    </div>`).join('') || '<p class="text-muted text-center" style="padding:12px">Sem comentários ainda. Seja o primeiro!</p>';

  const registrationActions = user ? (myReg
    ? `<button class="btn btn-danger btn-sm" id="leave-event-btn" data-reg-id="${myReg.id}">Sair do evento</button>
       <button class="btn btn-outline btn-sm" onclick="openEditRegModal(${myReg.id})">Editar dupla</button>`
    : user.role === 'atleta'
      ? `<button class="btn btn-primary" id="register-btn" data-event-id="${ev.id}">Inscrever-se — ${formatCurrency(ev.registration_fee)}</button>`
      : '') : `<a href="#/login" class="btn btn-primary">Entre para se inscrever</a>`;

  const orgActions = isOwner ? `
    <div class="card mb-12">
      <div class="card-body">
        <div style="font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Ações do Organizador</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="openEditEventModal(${ev.id})">Editar evento</button>
          <button class="btn btn-secondary btn-sm" onclick="confirmArena(${ev.id})">Confirmar arena</button>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent(${ev.id})">Excluir</button>
        </div>
      </div>
    </div>` : '';

  return `
    <div class="event-detail-header">
      <button class="back-btn" onclick="history.back()" style="color:rgba(255,255,255,.7);margin-bottom:12px">← Voltar</button>
      <div class="event-detail-modality">${getModalityLabel(ev.modality)}</div>
      <div class="event-detail-title">${ev.title}</div>
      <div class="event-detail-meta">
        <div class="event-detail-meta-row">${formatDate(ev.event_date)} às ${(ev.start_time||'').slice(0,5)}</div>
        <div class="event-detail-meta-row">${ev.arena_name} — ${ev.arena_address}, ${ev.arena_city}/${ev.arena_state}</div>
        <div class="event-detail-meta-row">Organizado por ${ev.organizer_name}</div>
      </div>
    </div>

    <div class="container" style="padding-top:16px">
      ${orgActions}

      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon stat-icon-orange"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 9h16M9 1v16"/></svg></div><div class="stat-card-text"><div class="stat-value">${formatCurrency(ev.registration_fee)}</div><div class="stat-label">Inscrição</div></div></div>
        <div class="stat-card"><div class="stat-icon stat-icon-black"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="stat-card-text"><div class="stat-value">${ev.participant_limit}</div><div class="stat-label">Vagas (pagos)</div></div></div>
        <div class="stat-card"><div class="stat-icon stat-icon-military"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 6L7 15l-4-4"/></svg></div><div class="stat-card-text"><div class="stat-value">${paid.length}</div><div class="stat-label">Confirmados</div></div></div>
        <div class="stat-card"><div class="stat-icon stat-icon-orange"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="7"/><path d="M9 5v4l3 3"/></svg></div><div class="stat-card-text"><div class="stat-value">${pending.length}</div><div class="stat-label">Aguardando</div></div></div>
      </div>

      <!-- Arena Status -->
      <div class="card mb-12">
        <div class="card-body" style="display:flex;align-items:center;gap:12px">
          <div style="font-size:1.5rem">${ev.arena_confirmed ? 'Sim' : 'Não'}</div>
          <div>
            <div style="font-weight:700;font-size:.9rem">Arena: ${ev.arena_name}</div>
            <div class="text-muted">${ev.arena_confirmed ? 'Evento confirmado pela arena!' : 'Aguardando confirmação da arena'}</div>
          </div>
          <span class="status-pill status-${ev.arena_confirmed ? 'confirmado' : 'pendente'}" style="margin-left:auto">${ev.arena_confirmed ? 'Confirmado' : 'Pendente'}</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn active" data-tab="info">Informações</button>
        <button class="tab-btn" data-tab="confirmados">Pagos (${paid.length})</button>
        <button class="tab-btn" data-tab="inscritos">Inscritos (${pending.length})</button>
        <button class="tab-btn" data-tab="comentarios">Dúvidas (${comments.length})</button>
      </div>

      <div id="tab-info" class="tab-content">
        ${ev.description ? `<div class="card mb-12"><div class="card-body"><h3 style="font-size:1rem;margin-bottom:8px">Sobre o evento</h3><p style="font-size:.9rem;color:var(--text-secondary)">${ev.description}</p></div></div>` : ''}
        ${ev.rules ? `<div class="card mb-12"><div class="card-body"><h3 style="font-size:1rem;margin-bottom:8px">Regras</h3><p style="font-size:.9rem;color:var(--text-secondary);white-space:pre-wrap">${ev.rules}</p></div></div>` : ''}
        <div class="card mb-12">
          <div class="card-body">
            <h3 style="font-size:1rem;margin-bottom:10px">Local</h3>
            <div style="font-weight:600">${ev.arena_name}</div>
            <div class="text-muted">${ev.arena_address}, ${ev.arena_city} - ${ev.arena_state}</div>
            ${ev.arena_phone ? `<div class="text-muted">${ev.arena_phone}</div>` : ''}
          </div>
        </div>
        <div style="margin-top:16px">${registrationActions}</div>
      </div>

      <div id="tab-confirmados" class="tab-content" style="display:none">
        <div class="athlete-list">${paidList}</div>
      </div>

      <div id="tab-inscritos" class="tab-content" style="display:none">
        <div class="athlete-list">${pendingList}</div>
      </div>

      <div id="tab-comentarios" class="tab-content" style="display:none">
        <div class="comment-list" id="comment-list">${commentsList}</div>
        ${user ? `<div class="comment-form" style="margin-top:16px">
          <input type="text" id="comment-input" placeholder="Escreva sua dúvida...">
          <button class="btn btn-primary btn-sm" onclick="sendComment(${ev.id})">Enviar</button>
        </div>` : ''}
      </div>
    </div>`;
}

function bindEventDetailActions(ev, user, myReg) {
  // Tabs
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-content').forEach(c => c.style.display = 'none');
      const tab = btn.getAttribute('data-tab');
      const el = $(`#tab-${tab}`);
      if (el) el.style.display = 'block';
    });
  });

  // Register button
  const regBtn = $('#register-btn');
  if (regBtn) {
    regBtn.addEventListener('click', () => openRegisterModal(ev.id, ev));
  }

  // Leave event
  const leaveBtn = $('#leave-event-btn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (!confirm('Tem certeza que deseja sair deste evento?')) return;
      try {
        await apiFetch(`/registrations/${leaveBtn.dataset.regId}`, { method: 'DELETE' });
        toast('Você saiu do evento.', 'info');
        navigate('#/');
      } catch (err) { toast(err.message, 'error'); }
    });
  }
}

window.sendComment = async function(eventId) {
  const input = $('#comment-input');
  if (!input || !input.value.trim()) return;
  try {
    await apiFetch(`/events/${eventId}/comment`, { method: 'POST', body: JSON.stringify({ message: input.value }) });
    input.value = '';
    toast('Comentário enviado!', 'success');
    // Re-render
    navigate(`#/eventos/${eventId}`);
  } catch (err) { toast(err.message, 'error'); }
};

window.confirmPayment = async function(regId) {
  try {
    await apiFetch(`/registrations/${regId}/confirm-payment`, { method: 'PUT' });
    toast('Pagamento confirmado!', 'success');
    const hash = window.location.hash;
    navigate('#/');
    setTimeout(() => navigate(hash), 100);
  } catch (err) { toast(err.message, 'error'); }
};

window.confirmArena = async function(eventId) {
  if (!confirm('Confirmar o evento nesta arena?')) return;
  try {
    await apiFetch(`/events/${eventId}/confirm-arena`, { method: 'PUT' });
    toast('Evento confirmado pela arena!', 'success');
    navigate(`#/eventos/${eventId}`);
  } catch (err) { toast(err.message, 'error'); }
};

window.deleteEvent = async function(eventId) {
  if (!confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) return;
  try {
    await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
    toast('Evento excluído.', 'info');
    navigate('#/');
  } catch (err) { toast(err.message, 'error'); }
};

// ── REGISTER MODAL ──
function openRegisterModal(eventId, ev) {
  const modality = ev.modality || '';
  const needsPartner = !modality.includes('1x1');
  const user = getUser();

  const html = `
    <div class="modal-overlay" id="reg-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Inscrição no evento</h2>
          <button class="modal-close" onclick="$('#reg-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="card mb-12" style="background:var(--gray-50)">
            <div class="card-body" style="padding:14px;display:flex;align-items:center;gap:12px">
              <div class="profile-avatar-sm" style="width:40px;height:40px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;overflow:hidden;flex-shrink:0">
                ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover">` : (user.name||'U').charAt(0)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:.9rem">${user.name}</div>
                <div style="font-size:.78rem;color:var(--text-secondary)">${user.email} ${user.phone ? '| ' + user.phone : ''}</div>
              </div>
              <svg width="16" height="16" fill="none" stroke="var(--military)" stroke-width="2.5"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nome da equipe (opcional)</label>
            <input type="text" class="form-control" id="r-team" placeholder="Ex: Silva & Pereira">
          </div>
          ${needsPartner ? `
          <div class="form-group">
            <label class="form-label" style="margin-bottom:8px">Convidar parceiro/a</label>
            <div style="position:relative">
              <input type="text" class="form-control" id="r-partner-search" placeholder="Buscar por nome ou e-mail..." autocomplete="off" oninput="searchPartner(this.value)">
              <div id="partner-results" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--gray-200);border-radius:8px;max-height:180px;overflow-y:auto;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,.1)"></div>
            </div>
            <div id="selected-partner" style="display:none;margin-top:8px"></div>
            <div style="text-align:center;margin:10px 0;font-size:.78rem;color:var(--text-secondary)">ou preencha manualmente</div>
            <div class="form-group">
              <input type="text" class="form-control" id="r-partner-name" placeholder="Nome completo do parceiro/a">
            </div>
            <div class="form-group">
              <input type="email" class="form-control" id="r-partner-email" placeholder="E-mail do parceiro/a">
            </div>
          </div>` : ''}
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea class="form-control" id="r-notes" placeholder="Alguma informação adicional?"></textarea>
          </div>
          <div class="card" style="background:var(--orange-xlight)">
            <div class="card-body" style="padding:12px">
              <div style="font-weight:700;color:var(--orange)">Valor da inscrição: ${formatCurrency(ev.registration_fee)}</div>
              <div style="font-size:.8rem;color:var(--text-secondary);margin-top:4px">O pagamento deve ser confirmado pelo organizador.</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="$('#reg-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="confirm-reg-btn">Confirmar inscrição</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  let selectedPartnerId = null;

  window.searchPartner = async function(q) {
    if (q.length < 2) { $('#partner-results').style.display = 'none'; return; }
    try {
      const users = await apiFetch('/users/search?q=' + encodeURIComponent(q));
      const results = (users || []).filter(u => u.id !== user.id);
      if (!results.length) {
        $('#partner-results').innerHTML = '<div style="padding:10px;font-size:.82rem;color:var(--text-secondary)">Nenhum usuário encontrado</div>';
      } else {
        $('#partner-results').innerHTML = results.map(u => `
          <div style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--gray-100)" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''" onclick="selectPartner(${u.id}, '${(u.name||'').replace(/'/g,"\\'")}', '${u.email||''}')">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--military);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;overflow:hidden;flex-shrink:0">
              ${u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover">` : (u.name||'U').charAt(0)}
            </div>
            <div><div style="font-size:.85rem;font-weight:600">${u.name}</div><div style="font-size:.75rem;color:var(--text-secondary)">${u.email}</div></div>
          </div>`).join('');
      }
      $('#partner-results').style.display = 'block';
    } catch (e) { $('#partner-results').style.display = 'none'; }
  };

  window.selectPartner = function(id, name, email) {
    selectedPartnerId = id;
    $('#partner-results').style.display = 'none';
    $('#r-partner-search').value = '';
    if ($('#r-partner-name')) $('#r-partner-name').value = name;
    if ($('#r-partner-email')) $('#r-partner-email').value = email;
    $('#selected-partner').style.display = 'block';
    $('#selected-partner').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--gray-50);border-radius:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--military);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">${name.charAt(0)}</div>
        <div style="flex:1"><span style="font-weight:600;font-size:.85rem">${name}</span><span style="font-size:.78rem;color:var(--text-secondary);margin-left:6px">${email}</span></div>
        <button onclick="clearPartner()" style="border:none;background:none;cursor:pointer;color:var(--text-secondary);font-size:18px">✕</button>
      </div>`;
  };

  window.clearPartner = function() {
    selectedPartnerId = null;
    $('#selected-partner').style.display = 'none';
    if ($('#r-partner-name')) $('#r-partner-name').value = '';
    if ($('#r-partner-email')) $('#r-partner-email').value = '';
  };

  $('#confirm-reg-btn').addEventListener('click', async () => {
    const btn = $('#confirm-reg-btn');
    btn.disabled = true; btn.textContent = 'Inscrevendo...';
    try {
      const regBody = {
        event_id: eventId,
        team_name: $('#r-team')?.value,
        partner_name: $('#r-partner-name')?.value,
        partner_email: $('#r-partner-email')?.value,
        notes: $('#r-notes')?.value
      };
      const regResult = await apiFetch('/registrations', {
        method: 'POST',
        body: JSON.stringify(regBody)
      });

      if (selectedPartnerId && regResult?.id) {
        try {
          await apiFetch('/invites', {
            method: 'POST',
            body: JSON.stringify({
              event_id: eventId,
              registration_id: regResult.id,
              invitee_id: selectedPartnerId
            })
          });
        } catch (invErr) { console.warn('Convite não enviado:', invErr.message); }
      }

      $('#reg-modal').remove();
      toast('Inscrição realizada com sucesso!', 'success');
      navigate(`#/eventos/${eventId}`);
    } catch (err) {
      if (err.message && err.message.includes('perfil')) {
        $('#reg-modal').remove();
        toast('Complete seu perfil para se inscrever.', 'error');
        navigate('#/perfil');
        return;
      }
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Confirmar inscrição';
    }
  });
}

// ── CREATE / EDIT EVENT ──
async function renderCreateEvent(el) {
  const user = getUser();
  if (user?.role !== 'organizador') return navigate('#/');

  let arenas = [];
  try { arenas = await apiFetch('/arenas'); } catch (e) {}

  const arenaOptions = arenas.map(a => `<option value="${a.id}">${a.name} — ${a.city}</option>`).join('');
  const modalityOptions = MODALITIES.map(m => `<option value="${m}">${getModalityLabel(m)}</option>`).join('');

  el.innerHTML = `
    <div class="page-header">
      <div class="container">
        <button class="back-btn" onclick="history.back()">← Voltar</button>
        <h1>Criar novo evento</h1>
      </div>
    </div>
    <div class="container">
      <div class="card">
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Nome do evento *</label>
            <input type="text" class="form-control" id="ev-title" placeholder="Ex: Torneio Open de Verão">
          </div>
          <div class="form-group">
            <label class="form-label">Modalidade *</label>
            <select class="form-control" id="ev-modality"><option value="">Selecione...</option>${modalityOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Arena *</label>
            <select class="form-control" id="ev-arena"><option value="">Selecione a arena...</option>${arenaOptions}</select>
            <a href="#/arenas" style="font-size:.8rem;color:var(--orange);text-decoration:none;margin-top:4px;display:inline-block">+ Cadastrar nova arena</a>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Data *</label>
              <input type="date" class="form-control" id="ev-date">
            </div>
            <div class="form-group">
              <label class="form-label">Horário *</label>
              <input type="time" class="form-control" id="ev-time">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Valor da inscrição (R$)</label>
              <input type="number" class="form-control" id="ev-fee" placeholder="0.00" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">Limite de pagantes</label>
              <input type="number" class="form-control" id="ev-limit" placeholder="16" min="2">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-control" id="ev-desc" placeholder="Descreva o evento..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Regras</label>
            <textarea class="form-control" id="ev-rules" placeholder="Regras do torneio..." style="min-height:120px"></textarea>
          </div>
          <button class="btn btn-primary btn-block" id="create-ev-btn">Criar evento</button>
        </div>
      </div>
    </div>`;

  $('#create-ev-btn').addEventListener('click', async () => {
    const btn = $('#create-ev-btn');
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const data = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          arena_id: $('#ev-arena').value,
          title: $('#ev-title').value,
          modality: $('#ev-modality').value,
          event_date: $('#ev-date').value,
          start_time: $('#ev-time').value,
          registration_fee: $('#ev-fee').value || 0,
          participant_limit: $('#ev-limit').value || 16,
          description: $('#ev-desc').value,
          rules: $('#ev-rules').value
        })
      });
      toast('Evento criado com sucesso!', 'success');
      navigate(`#/eventos/${data.id}`);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Criar evento';
    }
  });
}

// ── EVENT LIST ──
async function renderEventList(el) {
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const events = await apiFetch('/events');
    if (!events) return;
    const cards = events.map(e => buildEventCard(e)).join('');
    el.innerHTML = `
      <div class="page-header"><div class="container"><h1>Todos os Eventos</h1></div></div>
      <div class="container">
        <div class="filter-bar">${['Todos','Vôlei','Futevôlei','Beach Tennis'].map((f,i) => `<button class="filter-chip ${i===0?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>
        <div class="events-grid" id="events-grid">${cards || '<div class="empty-state" style="grid-column:1/-1"><p>Nenhum evento disponível</p></div>'}</div>
      </div>`;
    bindFilters();
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><p>${err.message}</p></div></div>`;
  }
}

// ── MY REGISTRATIONS ──
async function renderMyRegistrations(el) {
  const user = getUser();
  if (user?.role !== 'atleta') return navigate('#/');
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const regs = await apiFetch('/registrations/my');
    if (!regs) return;
    const cards = regs.map(r => `
      <div class="card event-card" onclick="navigate('#/eventos/${r.event_id}')">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:.72rem;font-weight:700;letter-spacing:.08em;color:var(--orange);text-transform:uppercase">${getModalityLabel(r.modality)}</div>
              <div style="font-weight:700;font-size:1rem;margin-top:2px">${r.title}</div>
            </div>
            <span class="athlete-status-badge ${r.payment_status==='pago'?'badge-paid':'badge-pending'}">${r.payment_status==='pago'?'✓ Pago':'Pendente'}</span>
          </div>
          <div class="event-card-meta">
            <div class="event-meta-row"><span class="icon"></span>${formatDate(r.event_date)}</div>
            <div class="event-meta-row"><span class="icon"></span>${r.arena_name}, ${r.arena_city}</div>
            <div class="event-meta-row"><span class="icon"></span>${formatCurrency(r.registration_fee)}</div>
          </div>
        </div>
      </div>`).join('') || '<div class="empty-state"><p>Você ainda não está inscrito em nenhum evento.<br><a href="#/" style="color:var(--orange)">Ver eventos disponíveis</a></p></div>';

    el.innerHTML = `
      <div class="page-header"><div class="container"><h1>Minhas Inscrições</h1></div></div>
      <div class="container"><div class="events-grid">${cards}</div></div>`;
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><p>${err.message}</p></div></div>`;
  }
}

// ── MY INVITES ──
async function renderMyInvites(el) {
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const [received, sent] = await Promise.all([
      apiFetch('/invites/my').catch(() => []),
      apiFetch('/invites/sent').catch(() => [])
    ]);
    const recvList = Array.isArray(received) ? received : [];
    const sentList = Array.isArray(sent) ? sent : [];

    const recvCards = recvList.map(inv => `
      <div class="card mb-12">
        <div class="card-body" style="padding:14px;display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">${(inv.inviter_name||'?').charAt(0)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.88rem">${inv.inviter_name||'Jogador'} convidou você</div>
            <div style="font-size:.78rem;color:var(--text-secondary)">${inv.event_title||'Evento'} - ${inv.modality||''}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary btn-sm" onclick="respondInvite(${inv.id},'accept')">Aceitar</button>
            <button class="btn btn-outline btn-sm" onclick="respondInvite(${inv.id},'decline')">Recusar</button>
          </div>
        </div>
      </div>`).join('') || '<div class="empty-state"><p>Nenhum convite recebido</p></div>';

    const sentCards = sentList.map(inv => `
      <div class="card mb-12">
        <div class="card-body" style="padding:14px;display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--military);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">${(inv.invitee_name||inv.invitee_email||'?').charAt(0)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.88rem">${inv.invitee_name||inv.invitee_email||'Convidado'}</div>
            <div style="font-size:.78rem;color:var(--text-secondary)">${inv.event_title||'Evento'} - <span style="color:${inv.status==='aceito'?'var(--military)':inv.status==='recusado'?'var(--danger)':'var(--orange)'}">${inv.status}</span></div>
          </div>
        </div>
      </div>`).join('') || '<div class="empty-state"><p>Nenhum convite enviado</p></div>';

    el.innerHTML = `
      <div class="page-header"><div class="container"><h1>Convites</h1></div></div>
      <div class="container">
        <div style="font-weight:700;font-size:1rem;margin-bottom:12px">Recebidos</div>
        ${recvCards}
        <div style="font-weight:700;font-size:1rem;margin:20px 0 12px">Enviados</div>
        ${sentCards}
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><p>${err.message}</p></div></div>`;
  }
}

window.respondInvite = async function(id, action) {
  try {
    await apiFetch(`/invites/${id}/${action}`, { method: 'PUT' });
    toast(action === 'accept' ? 'Convite aceito!' : 'Convite recusado.', action === 'accept' ? 'success' : 'info');
    renderMyInvites($('#page-content'));
  } catch (err) { toast(err.message, 'error'); }
};

// ── INVITE TOKEN PAGE ──
async function renderInvitePage(el, token) {
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const inv = await apiFetch(`/invites/token/${token}`);
    if (!inv) { el.innerHTML = `<div class="container"><div class="empty-state"><p>Convite não encontrado.</p></div></div>`; return; }
    const user = getUser();

    el.innerHTML = `
      <div class="container" style="max-width:500px;margin:40px auto">
        <div class="card">
          <div class="card-body" style="padding:28px;text-align:center">
            <svg width="48" height="48" fill="none" stroke="var(--orange)" stroke-width="1.5" style="margin-bottom:16px"><rect x="6" y="6" width="36" height="36" rx="8"/><path d="M16 24l6 6 12-12"/></svg>
            <h2 style="margin-bottom:6px">Convite para torneio</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px">${inv.inviter_name||'Um jogador'} convidou você para participar como dupla.</p>
            <div class="card mb-12" style="background:var(--gray-50);text-align:left">
              <div class="card-body" style="padding:14px">
                <div style="font-weight:700;margin-bottom:4px">${inv.event_title||'Evento'}</div>
                <div style="font-size:.82rem;color:var(--text-secondary)">${inv.modality||''}</div>
              </div>
            </div>
            ${inv.status !== 'pendente' ? `<div style="font-weight:600;color:var(--text-secondary)">Este convite já foi ${inv.status}.</div>` :
            !user ? `<div style="margin-top:12px"><p style="font-size:.85rem;color:var(--text-secondary)">Faça login ou crie sua conta para aceitar o convite.</p><a href="#/login" class="btn btn-primary btn-block" style="margin-top:10px">Entrar / Cadastrar</a></div>` :
            `<div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
              <button class="btn btn-primary" onclick="acceptInviteToken('${token}')">Aceitar convite</button>
              <button class="btn btn-outline" onclick="declineInviteToken('${token}')">Recusar</button>
            </div>`}
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><p>Convite não encontrado ou expirado.</p></div></div>`;
  }
}

window.acceptInviteToken = async function(token) {
  try {
    await apiFetch(`/invites/token/${token}/accept`, { method: 'PUT' });
    toast('Convite aceito! Você foi adicionado como dupla.', 'success');
    navigate('#/minhas-inscricoes');
  } catch (err) { toast(err.message, 'error'); }
};

window.declineInviteToken = async function(token) {
  try {
    await apiFetch(`/invites/token/${token}/decline`, { method: 'PUT' });
    toast('Convite recusado.', 'info');
    navigate('#/');
  } catch (err) { toast(err.message, 'error'); }
};

// ── DASHBOARD (organizador) ──
async function renderDashboard(el) {
  el.innerHTML = `<div class="stats-grid">${Array(4).fill('<div class="skeleton skel-card" style="height:80px"></div>').join('')}</div>`;
  try {
    const events = await apiFetch('/events');
    if (!events) return;
    const user = getUser();
    const myEvents = events.filter(e => e.organizer_id === user?.id);
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
        <div class="filter-bar">${['Todos','Vôlei','Futevôlei','Beach Tennis'].map((f,i) => `<button class="filter-chip ${i===0?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>
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
}

// ── PROFILE ──
async function renderProfile(el) {
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const user = await apiFetch('/users/me');
    if (!user) return;

    // Load stats for the profile summary
    let statsHTML = '';
    if (user.role === 'organizador') {
      const [eventsAll, orgEvents] = await Promise.all([
        apiFetch('/events').catch(() => []),
        apiFetch('/events/organizer/mine').catch(() => null)
      ]);
      const myEvents = orgEvents || (eventsAll || []).filter(e => e.organizer_id === user.id);
      const totalInscritos = myEvents.reduce((a, e) => a + (parseInt(e.total_registered) || 0), 0);
      const confirmedCount = myEvents.filter(e => e.status === 'confirmado').length;
      const pendingCount = myEvents.filter(e => e.status === 'pendente').length;
      statsHTML = `
        <div class="stats-grid" style="margin-top:20px">
          <div class="stat-card"><div class="stat-icon stat-icon-orange"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M16 2v4M4 2v4M2 8h16"/></svg></div><div><div class="stat-value">${myEvents.length}</div><div class="stat-label">Meus Eventos</div></div></div>
          <div class="stat-card"><div class="stat-icon stat-icon-military"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></div><div><div class="stat-value">${confirmedCount}</div><div class="stat-label">Confirmados</div></div></div>
          <div class="stat-card"><div class="stat-icon stat-icon-black"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4-4v2"/><circle cx="10" cy="7" r="4"/></svg></div><div><div class="stat-value">${totalInscritos}</div><div class="stat-label">Inscrições</div></div></div>
          <div class="stat-card"><div class="stat-icon stat-icon-orange"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></svg></div><div><div class="stat-value">${pendingCount}</div><div class="stat-label">Pendentes</div></div></div>
        </div>`;
    } else {
      const myRegs = await apiFetch('/registrations/my').catch(() => []);
      const regs = Array.isArray(myRegs) ? myRegs : [];
      const paidCount = regs.filter(r => r.payment_status === 'pago').length;
      const pendingCount = regs.filter(r => r.payment_status === 'pendente').length;
      statsHTML = `
        <div class="stats-grid" style="margin-top:20px">
          <div class="stat-card"><div class="stat-icon stat-icon-orange"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M16 2v4M4 2v4M2 8h16"/></svg></div><div><div class="stat-value">${regs.length}</div><div class="stat-label">Inscrições</div></div></div>
          <div class="stat-card"><div class="stat-icon stat-icon-military"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></div><div><div class="stat-value">${paidCount}</div><div class="stat-label">Confirmados</div></div></div>
          <div class="stat-card"><div class="stat-icon stat-icon-orange"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></svg></div><div><div class="stat-value">${pendingCount}</div><div class="stat-label">Pendentes</div></div></div>
        </div>`;
    }

    const profileComplete = !!(user.name && user.phone && user.cpf && user.birth_date && user.gender && user.city && user.state);

    el.innerHTML = `
      <div class="profile-page">
        <div class="profile-cover" onclick="$('#banner-input').click()" style="cursor:pointer">
          ${user.banner ? `<img src="${user.banner}" class="profile-cover-img">` : '<div class="profile-cover-pattern"></div>'}
          <div class="profile-cover-edit">Alterar capa</div>
          <input type="file" id="banner-input" accept="image/*" style="display:none" onchange="uploadBanner(this)">
        </div>
        <div class="profile-body">
          <div class="profile-avatar-section">
            <div class="profile-avatar-xl" onclick="$('#avatar-input').click()">
              ${user.avatar ? `<img src="${user.avatar}" alt="">` : avatarInitials(user.name)}
              <div class="avatar-overlay">Foto</div>
              <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="uploadAvatar(this)">
            </div>
          </div>
          <div class="profile-name-section">
            <div class="profile-display-name">${user.name}</div>
            <div class="profile-role-chip ${user.role === 'organizador' ? 'chip-organizer' : 'chip-athlete'}">${user.role === 'organizador' ? 'Organizador' : 'Atleta'}</div>
          </div>

          ${statsHTML}

          ${profileComplete ? '' : `
          <div class="card mb-12" style="border-left:3px solid var(--orange);background:var(--orange-xlight,#fff5f0)">
            <div class="card-body" style="padding:12px;display:flex;align-items:center;gap:10px">
              <svg width="20" height="20" fill="none" stroke="var(--orange)" stroke-width="2"><circle cx="10" cy="10" r="9"/><path d="M10 6v4M10 13h.01"/></svg>
              <div style="flex:1">
                <div style="font-weight:700;font-size:.85rem;color:var(--orange)">Perfil incompleto</div>
                <div style="font-size:.78rem;color:var(--text-secondary)">Preencha todos os dados para se inscrever com 1 clique.</div>
              </div>
            </div>
          </div>`}

          <div class="profile-section-title">Informações pessoais</div>
          <div class="profile-info-grid">
            <div class="profile-field">
              <label class="form-label">Nome *</label>
              <input type="text" class="form-control" id="p-name" value="${user.name||''}">
            </div>
            <div class="profile-field">
              <label class="form-label">Telefone *</label>
              <input type="tel" class="form-control" id="p-phone" value="${user.phone||''}" placeholder="(11) 99999-9999">
            </div>
            <div class="profile-field">
              <label class="form-label">CPF *</label>
              <input type="text" class="form-control" id="p-cpf" value="${user.cpf||''}" placeholder="000.000.000-00" maxlength="14" oninput="maskCPF(this)">
            </div>
            <div class="profile-field">
              <label class="form-label">Data de nascimento *</label>
              <input type="date" class="form-control" id="p-birth" value="${user.birth_date ? user.birth_date.slice(0,10) : ''}">
            </div>
            <div class="profile-field">
              <label class="form-label">Gênero *</label>
              <select class="form-control" id="p-gender">
                <option value="">Selecione...</option>
                <option value="masculino" ${user.gender==='masculino'?'selected':''}>Masculino</option>
                <option value="feminino" ${user.gender==='feminino'?'selected':''}>Feminino</option>
                <option value="outro" ${user.gender==='outro'?'selected':''}>Outro</option>
              </select>
            </div>
            <div class="profile-field">
              <label class="form-label">Tamanho da camisa</label>
              <select class="form-control" id="p-shirt">
                <option value="">Selecione...</option>
                ${['PP','P','M','G','GG','XGG'].map(s => `<option value="${s}" ${user.shirt_size===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="profile-field">
              <label class="form-label">Cidade *</label>
              <input type="text" class="form-control" id="p-city" value="${user.city||''}" placeholder="Ex: São Paulo">
            </div>
            <div class="profile-field">
              <label class="form-label">Estado *</label>
              <select class="form-control" id="p-state">
                <option value="">UF...</option>
                ${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => `<option value="${s}" ${user.state===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="profile-field" style="grid-column:1/-1">
              <label class="form-label">E-mail</label>
              <input type="email" class="form-control" value="${user.email||''}" disabled style="opacity:.6">
            </div>
            <div class="profile-field" style="grid-column:1/-1">
              <label class="form-label">Bio</label>
              <textarea class="form-control" id="p-bio">${user.bio||''}</textarea>
            </div>
          </div>
          <div class="profile-save-bar">
            <span style="font-size:.85rem;color:var(--gray-500)">Campos com * são obrigatórios para inscrição</span>
            <button class="btn btn-primary" onclick="saveProfile()">Salvar</button>
          </div>

          <div class="profile-section-title" style="margin-top:28px">Alterar senha</div>
          <div class="profile-info-grid">
            <div class="profile-field">
              <label class="form-label">Senha atual</label>
              <input type="password" class="form-control" id="p-curr-pass">
            </div>
            <div class="profile-field">
              <label class="form-label">Nova senha</label>
              <input type="password" class="form-control" id="p-new-pass">
            </div>
          </div>
          <button class="btn btn-ghost" onclick="savePassword()">Alterar senha</button>

          <div style="margin-top:28px">
            <button class="btn btn-danger btn-block" id="logout-btn">Sair da conta</button>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><p>${err.message}</p></div></div>`;
  }
}

window.saveProfile = async function() {
  try {
    const body = {
      name: $('#p-name').value,
      phone: $('#p-phone').value,
      bio: $('#p-bio').value,
      cpf: $('#p-cpf').value.replace(/\D/g, ''),
      birth_date: $('#p-birth').value || null,
      gender: $('#p-gender').value || null,
      city: $('#p-city').value,
      state: $('#p-state').value,
      shirt_size: $('#p-shirt').value || null
    };
    await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(body) });
    const u = getUser();
    if (u) {
      Object.assign(u, body);
      u.name = $('#p-name').value;
      setAuth(getToken(), u);
    }
    toast('Perfil atualizado!', 'success');
    updateNav();
    renderProfile($('#page-content'));
  } catch (err) { toast(err.message, 'error'); }
};

window.savePassword = async function() {
  try {
    await apiFetch('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: $('#p-curr-pass').value, new_password: $('#p-new-pass').value })
    });
    toast('Senha alterada!', 'success');
    $('#p-curr-pass').value = ''; $('#p-new-pass').value = '';
  } catch (err) { toast(err.message, 'error'); }
};

window.uploadAvatar = async function(input) {
  if (!input.files[0]) return;
  const form = new FormData();
  form.append('avatar', input.files[0]);
  const res = await fetch(API + '/users/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form
  });
  const data = await res.json();
  if (res.ok) {
    toast('Foto atualizada!', 'success');
    const u = getUser(); if (u) { u.avatar = data.avatar; setAuth(getToken(), u); }
    renderProfile($('#page-content'));
    updateNav();
  } else { toast(data.error, 'error'); }
};

window.uploadBanner = async function(input) {
  if (!input.files[0]) return;
  const form = new FormData();
  form.append('banner', input.files[0]);
  const res = await fetch(API + '/users/me/banner', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form
  });
  const data = await res.json();
  if (res.ok) {
    toast('Capa atualizada!', 'success');
    const u = getUser(); if (u) { u.banner = data.banner; setAuth(getToken(), u); }
    renderProfile($('#page-content'));
  } else { toast(data.error, 'error'); }
};

window.maskCPF = function(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 9) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
  else if (v.length > 6) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
  else if (v.length > 3) v = v.slice(0,3) + '.' + v.slice(3);
  el.value = v;
};

// ── ARENAS ──
async function renderArenas(el) {
  const user = getUser();
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const arenas = await apiFetch('/arenas');
    const canCreate = user?.role === 'organizador';
    const list = arenas.map(a => `
      <div class="card mb-12">
        <div class="card-body">
          <div style="font-weight:700;font-size:1.05rem">${a.name}</div>
          <div class="text-muted">${a.address}, ${a.city} - ${a.state}</div>
          ${a.phone ? `<div class="text-muted">${a.phone}</div>` : ''}
          ${a.description ? `<div style="margin-top:8px;font-size:.85rem;color:var(--text-secondary)">${a.description}</div>` : ''}
        </div>
      </div>`).join('') || '<div class="empty-state"><div class="icon"></div><p>Nenhuma arena cadastrada.</p></div>';

    el.innerHTML = `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h1>Arenas</h1>
            ${canCreate ? `<button class="btn btn-primary btn-sm" onclick="showArenaModal()">+ Nova arena</button>` : ''}
          </div>
        </div>
      </div>
      <div class="container">${list}</div>`;
  } catch (err) {
    el.innerHTML = `<div class="container"><div class="empty-state"><p>${err.message}</p></div></div>`;
  }
}

window.showArenaModal = function() {
  const html = `
    <div class="modal-overlay" id="arena-modal">
      <div class="modal">
        <div class="modal-header"><h2>Nova Arena</h2><button class="modal-close" onclick="$('#arena-modal').remove()">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Nome *</label><input class="form-control" id="a-name" placeholder="Nome da arena"></div>
          <div class="form-group"><label class="form-label">Endereço *</label><input class="form-control" id="a-addr" placeholder="Rua, número"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">Cidade *</label><input class="form-control" id="a-city" placeholder="São Paulo"></div>
            <div class="form-group"><label class="form-label">Estado *</label><input class="form-control" id="a-state" placeholder="SP" maxlength="2"></div>
          </div>
          <div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="a-phone" placeholder="(11) 9999-9999"></div>
          <div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="a-email" type="email"></div>
          <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="a-desc"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="$('#arena-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="save-arena-btn">Salvar arena</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  $('#save-arena-btn').addEventListener('click', async () => {
    try {
      await apiFetch('/arenas', { method: 'POST', body: JSON.stringify({
        name: $('#a-name').value, address: $('#a-addr').value,
        city: $('#a-city').value, state: $('#a-state').value,
        phone: $('#a-phone').value, email: $('#a-email').value,
        description: $('#a-desc').value
      })});
      $('#arena-modal').remove();
      toast('Arena cadastrada!', 'success');
      renderArenas($('#page-content'));
    } catch (err) { toast(err.message, 'error'); }
  });
};

// ── INIT ──
(function init() {
  const user = getUser();
  if (user) {
    currentUser = user;
    initSocket();
    loadNotifs();
    setInterval(loadNotifs, 30000);
  }
})();

// ── SOCKET ENHANCEMENTS ──
// Redefine initSocket com autenticação e notificações em tempo real
(function() {
  const _orig = window.initSocket || function(){};
  window.initSocket = function() {
    if (typeof io === 'undefined') return;
    if (socket && socket.connected) return;
    socket = io();
    const user = getUser();
    if (user) {
      socket.emit('authenticate', user.id);
    }
    socket.on('registration_update', (data) => {
      loadNotifs();
      // Atualizar contador se estiver na página do evento
      if (window.location.hash.includes(data?.event_id)) {
        toast('Nova inscrição no evento!', 'info');
      }
    });
    socket.on('comment_update', (data) => {
      loadNotifs();
      if (window.location.hash.includes(data?.event_id)) {
        toast('Novo comentário adicionado.', 'info');
      }
    });
    socket.on('payment_update', (data) => {
      loadNotifs();
      if (window.location.hash.includes(data?.event_id)) {
        toast('Pagamento atualizado!', 'success');
      }
    });
    socket.on('bracket_update', () => {
      toast('Resultado de partida atualizado!', 'info');
    });
    // Notificações push em tempo real
    socket.on('notification', (notif) => {
      loadNotifs();
      toast(`${notif.title}: ${notif.message}`, notif.type === 'payment' ? 'success' : 'info');
    });
    socket.on('disconnect', () => {
      setTimeout(() => { if (!socket?.connected) initSocket(); }, 3000);
    });
  };
})();

// ── NAVBAR SCROLL SHADOW ──
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });
