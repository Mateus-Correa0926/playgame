// PlayGAME — Router Extension (router-ext.js)
// Adiciona novas rotas ao router existente

// Sobrescreve o renderPage original para incluir novas páginas
const _originalRenderPage = window.renderPage;

window.renderPage = function(hash) {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Chaveamento: #/chaveamento/:eventId
  if (hash.startsWith('#/chaveamento/')) {
    const id = hash.split('/')[2];
    return renderBrackets(content, id);
  }

  // Pagamentos do evento (organizador): #/pagamentos-evento/:eventId
  if (hash.startsWith('#/pagamentos-evento/')) {
    const id = hash.split('/')[2];
    const user = getUser();
    if (user?.role !== 'organizador') return navigate('#/');
    return renderPaymentsPage(content, id);
  }

  // Relatório do evento: #/relatorio/:eventId
  if (hash.startsWith('#/relatorio/')) {
    const id = hash.split('/')[2];
    const user = getUser();
    if (user?.role !== 'organizador') return navigate('#/');
    return renderEventReport(content, id);
  }

  // Atletas (organizador): #/atletas
  if (hash === '#/atletas') {
    const user = getUser();
    if (user?.role !== 'organizador') return navigate('#/');
    return renderAthletesList(content);
  }

  // Configurações: #/configuracoes
  if (hash === '#/configuracoes') {
    return renderSettings(content);
  }

  // Fallback para router original
  return _originalRenderPage(hash);
};

// ── LISTA DE ATLETAS ──
window.renderAthletesList = async function(el) {
  el.innerHTML = `
    <div class="page-header"><div class="container"><h1>Atletas</h1></div></div>
    <div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const athletes = await apiFetch('/admin/athletes');
    const rows = athletes.map(a => `
      <div class="card mb-12">
        <div class="card-body" style="padding:14px 16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="athlete-avatar" style="width:48px;height:48px;font-size:1rem">
              ${a.avatar ? `<img src="${esc(a.avatar)}">` : avatarInitials(a.name)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700">${esc(a.name)}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">${esc(a.email)}${a.phone ? ' · ' + esc(a.phone) : ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800;color:var(--orange)">${a.paid_registrations || 0}</div>
              <div style="font-size:.7rem;color:var(--text-muted)">pagos</div>
            </div>
          </div>
          <div style="display:flex;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--gray-border)">
            <div><span style="font-size:.7rem;color:var(--text-muted)">Total inscrições</span><div style="font-weight:700;font-size:.9rem">${a.total_registrations || 0}</div></div>
            <div><span style="font-size:.7rem;color:var(--text-muted)">Membro desde</span><div style="font-weight:700;font-size:.9rem">${new Date(a.created_at).toLocaleDateString('pt-BR')}</div></div>
          </div>
        </div>
      </div>`).join('') || '<div class="empty-state"><p>Nenhum atleta cadastrado.</p></div>';

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="container">
          <button class="back-btn" onclick="history.back()">← Voltar</button>
          <h1>Atletas cadastrados</h1>
          <p>${athletes.length} atleta(s) no sistema</p>
        </div>
      </div>
      <div class="container">${rows}</div>`;
  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error"><span class="alert-icon">!</span>${esc(err.message)}</div></div>`;
  }
};

// ── CONFIGURAÇÕES ──
window.renderSettings = function(el) {
  const user = getUser();
  el.innerHTML = `
    <div class="page-header"><div class="container"><h1>Configurações</h1></div></div>
    <div class="container">
      <div class="card mb-12">
        <div class="card-body">
          <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:14px">Conta</div>
          <div onclick="navigate('#/perfil')" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-border);cursor:pointer">
            <span style="font-size:1.2rem"></span>
            <div style="flex:1"><div style="font-weight:600">Editar perfil</div><div style="font-size:.8rem;color:var(--text-muted)">${esc(user?.name || '')}</div></div>
            <span style="color:var(--text-muted)">›</span>
          </div>
          <div onclick="navigate('#/perfil')" style="display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer">
            <span style="font-size:1.2rem"></span>
            <div style="flex:1"><div style="font-weight:600">Alterar senha</div></div>
            <span style="color:var(--text-muted)">›</span>
          </div>
        </div>
      </div>
      ${user?.role === 'organizador' ? `
      <div class="card mb-12">
        <div class="card-body">
          <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:14px">Organizador</div>
          <div onclick="navigate('#/arenas')" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-border);cursor:pointer">
            <span style="font-size:1.2rem"></span>
            <div style="flex:1"><div style="font-weight:600">Gerenciar arenas</div></div>
            <span style="color:var(--text-muted)">›</span>
          </div>
          <div onclick="navigate('#/atletas')" style="display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer">
            <span style="font-size:1.2rem"></span>
            <div style="flex:1"><div style="font-weight:600">Ver atletas</div></div>
            <span style="color:var(--text-muted)">›</span>
          </div>
        </div>
      </div>` : ''}
      <div class="card mb-12">
        <div class="card-body">
          <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:14px">Sistema</div>
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-border)">
            <span style="font-size:1.2rem"></span>
            <div style="flex:1"><div style="font-weight:600">Versão</div><div style="font-size:.8rem;color:var(--text-muted)">PlayGAME v1.0.0 Beta</div></div>
          </div>
          <div onclick="clearCacheAndReload()" style="display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer">
            <span style="font-size:1.2rem"></span>
            <div style="flex:1"><div style="font-weight:600">Limpar cache e recarregar</div></div>
            <span style="color:var(--text-muted)">›</span>
          </div>
        </div>
      </div>
      <button class="btn btn-danger btn-block" id="logout-btn">Sair da conta</button>
    </div>`;
};

window.clearCacheAndReload = function() {
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
  window.location.reload(true);
};

// ── ADICIONAR BOTÕES AO DETALHE DO EVENTO ──
// Sobrescreve buildEventDetailHTML para adicionar botões do organizador
const _origBuildEventDetailHTML = window.buildEventDetailHTML;
if (_origBuildEventDetailHTML) {
  window.buildEventDetailHTML = function(ev, user, isOwner, myReg) {
    let html = _origBuildEventDetailHTML(ev, user, isOwner, myReg);

    // Adicionar botões extras do organizador
    if (isOwner) {
      const extraBtns = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-outline btn-sm" onclick="navigate('#/pagamentos-evento/${ev.id}')">Pagamentos</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('#/chaveamento/${ev.id}')">Chaveamento</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('#/relatorio/${ev.id}')">Relatório</button>
        </div>`;
      html = html.replace('</div>\n      </div><!-- /#main-app -->', extraBtns + '</div>\n      </div><!-- /#main-app -->');
    }
    return html;
  };
}

// ── BOTÃO DE COMPROVANTE NA INSCRIÇÃO DO ATLETA ──
// Adiciona ao card de inscrições do atleta
const _origRenderMyRegistrations = window.renderMyRegistrations;
if (_origRenderMyRegistrations) {
  window.renderMyRegistrations = async function(el) {
    await _origRenderMyRegistrations(el);
    // Adicionar botão de comprovante para inscrições pendentes
    // (Já está incluído no buildRegistrationCard extendido abaixo)
  };
}

// ── ATUALIZAR CARDS DE INSCRIÇÃO DO ATLETA com botão comprovante ──
// Sobrescreve renderMyRegistrations para mostrar botão de enviar comprovante
window.renderMyRegistrations = async function(el) {
  const user = getUser();
  if (user?.role !== 'atleta') return navigate('#/');
  el.innerHTML = `
    <div class="page-header"><div class="container"><h1>Minhas Inscrições</h1></div></div>
    <div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const regs = await apiFetch('/registrations/my');
    if (!regs) return;

    const upcoming = regs.filter(r => new Date(r.event_date) >= new Date());
    const past = regs.filter(r => new Date(r.event_date) < new Date());

    const buildCard = r => `
      <div class="card" style="margin-bottom:10px">
        <div class="card-body" style="padding:14px 16px;cursor:pointer" onclick="navigate('#/eventos/${r.event_id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:.72rem;font-weight:700;letter-spacing:.08em;color:var(--orange);text-transform:uppercase">${getModalityLabel(r.modality)}</div>
              <div style="font-weight:700;font-size:1rem;margin-top:2px">${esc(r.title)}</div>
            </div>
            <span class="athlete-status-badge ${r.payment_status==='pago'?'badge-paid':'badge-pending'}">${r.payment_status==='pago'?'✓ Pago':'Pendente'}</span>
          </div>
          <div class="event-card-meta">
            <div class="event-meta-row"><span class="icon"></span>${formatDate(r.event_date)} às ${(r.start_time||'').slice(0,5)}</div>
            <div class="event-meta-row"><span class="icon"></span>${esc(r.arena_name)}, ${esc(r.arena_city)}</div>
            <div class="event-meta-row"><span class="icon"></span>${formatCurrency(r.registration_fee)}</div>
            ${r.team_name ? `<div class="event-meta-row"><span class="icon"></span>${esc(r.team_name)}</div>` : ''}
            ${r.partner_name ? `<div class="event-meta-row"><span class="icon"></span>${esc(r.partner_name)}</div>` : ''}
          </div>
        </div>
        ${r.payment_status === 'pendente' ? `
          <div class="card-footer" style="justify-content:space-between">
            <span style="font-size:.8rem;color:var(--text-muted)">Pagamento pendente</span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openProofUploadModal(${r.id})">Enviar comprovante</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openEditRegModal(${r.id})">Editar</button>
            </div>
          </div>` : `
          <div class="card-footer">
            <span style="font-size:.8rem;color:var(--green);font-weight:600">✓ Pagamento confirmado</span>
            ${r.payment_confirmed_at ? `<span style="font-size:.75rem;color:var(--text-muted);margin-left:auto">${timeAgo(r.payment_confirmed_at)}</span>` : ''}
          </div>`}
      </div>`;

    const upcoming_html = upcoming.length > 0 ? upcoming.map(buildCard).join('') : '';
    const past_html = past.length > 0 ? past.map(buildCard).join('') : '';

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="container">
          <h1>Minhas Inscrições</h1>
          <p>${regs.length} inscrição(ões) no total</p>
        </div>
      </div>
      <div class="container">
        ${upcoming.length > 0 ? `
          <div class="section-header mb-12"><div class="section-title">Próximos eventos</div></div>
          ${upcoming_html}` : ''}
        ${past.length > 0 ? `
          <div class="section-header mb-12" style="margin-top:${upcoming.length>0?24:0}px"><div class="section-title" style="color:var(--text-muted)">Eventos anteriores</div></div>
          ${past_html}` : ''}
        ${regs.length === 0 ? `
          <div class="empty-state">
            <div class="icon"></div>
            <p>Você ainda não está inscrito em nenhum evento.</p>
            <a href="#/" class="btn btn-primary" style="margin-top:14px">Ver eventos disponíveis</a>
          </div>` : ''}
        <div style="margin-top:24px">
          <a href="#/" class="btn btn-outline btn-block">Explorar mais eventos</a>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error"><span class="alert-icon">!</span>${esc(err.message)}</div></div>`;
  }
};

console.log('PlayGAME Router Extension loaded');

// ── EXTENDER ROUTER COM NOVAS ROTAS ──
const _rp2 = window.renderPage;
window.renderPage = function(hash) {
  const content = document.getElementById('page-content');
  if (!content) return;

  if (hash === '#/busca') return renderSearchPage(content);
  if (hash.startsWith('#/atleta/')) return renderAthleteProfile(content, hash.split('/')[2]);
  if (hash.startsWith('#/arenas/')) return renderArenaDetail(content, hash.split('/')[2]);
  if (hash.startsWith('#/config-evento/')) return renderEventSettings(content, hash.split('/')[2]);

  return _rp2(hash);
};

// Atualizar links de arena para ir ao detalhe
window.renderArenas = async function(el) {
  const user = getUser();
  el.innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const arenas = await apiFetch('/arenas');
    const canCreate = user?.role === 'organizador';

    const list = arenas.map(a => `
      <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="navigate('#/arenas/${a.id}')">
        <div class="card-body" style="padding:14px 16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:var(--radius-sm);background:var(--green-xlight);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:1rem">${a.name}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">${a.address}, ${a.city} — ${a.state}</div>
              ${a.phone ? `<div style="font-size:.78rem;color:var(--text-muted)">${a.phone}</div>` : ''}
            </div>
            <span style="color:var(--text-muted);font-size:1.2rem">›</span>
          </div>
          ${a.description ? `<div style="margin-top:8px;font-size:.82rem;color:var(--text-secondary);padding-top:8px;border-top:1px solid var(--gray-border)">${a.description.slice(0,120)}${a.description.length>120?'…':''}</div>` : ''}
        </div>
      </div>`).join('') || '<div class="empty-state"><div class="icon"></div><p>Nenhuma arena cadastrada.</p></div>';

    el.innerHTML = `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><h1>Arenas</h1><p>${arenas.length} arena(s) cadastrada(s)</p></div>
            ${canCreate ? `<button class="btn btn-primary btn-sm" onclick="showArenaModal()">+ Nova</button>` : ''}
          </div>
        </div>
      </div>
      <div class="container">${list}</div>`;
  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error"><span class="alert-icon">!</span>${err.message}</div></div>`;
  }
};

// Mostrar onboarding para visitantes sem conta
(function() {
  const onboarded = localStorage.getItem('pg_onboarded');
  if (!getUser() && !onboarded && window.showOnboarding) {
    setTimeout(showOnboarding, 500);
  }
})();
