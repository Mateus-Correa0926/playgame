// PlayGAME — Páginas Adicionais Completas (pages-extra.js)

// ════════════════════════════════════════════
// BUSCA AVANÇADA — #/busca
// ════════════════════════════════════════════
window.renderSearchPage = async function(el) {
  el.innerHTML = `
    <div style="background:var(--black);padding:16px 16px 0">
      <h1 style="color:var(--white);font-size:1.6rem;margin-bottom:12px">Busca Avançada</h1>
      <div style="background:rgba(255,255,255,.08);border-radius:var(--radius);padding:16px;margin-bottom:0">
        <div class="form-group" style="margin-bottom:10px">
          <input type="text" class="form-control" id="adv-q" placeholder="Nome do evento ou arena..." style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <select class="form-control" id="adv-modality" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
            <option value="">Modalidade</option>
            ${MODALITIES.map(m=>`<option value="${m}">${getModalityLabel(m)}</option>`).join('')}
          </select>
          <input type="text" class="form-control" id="adv-city" placeholder="Cidade" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <input type="date" class="form-control" id="adv-date-from" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
          <select class="form-control" id="adv-status" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
            <option value="">Qualquer status</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="runAdvancedSearch()">Buscar</button>
      </div>
    </div>
    <div class="container" style="padding-top:16px" id="search-results">
      <div class="empty-state"><p>Use os filtros acima para encontrar eventos.</p></div>
    </div>`;
};

window.runAdvancedSearch = async function() {
  const q = document.getElementById('adv-q')?.value || '';
  const modality = document.getElementById('adv-modality')?.value || '';
  const city = document.getElementById('adv-city')?.value || '';
  const status = document.getElementById('adv-status')?.value || '';
  const resultsEl = document.getElementById('search-results');
  if (!resultsEl) return;

  resultsEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (modality) params.set('modality', modality);
    if (city) params.set('city', city);
    if (status) params.set('status', status);

    const events = await apiFetch(`/events/search?${params}`);
    if (!events || events.length === 0) {
      resultsEl.innerHTML = '<div class="empty-state"><p>Nenhum evento encontrado para esta busca.</p></div>';
      return;
    }
    resultsEl.innerHTML = `
      <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:12px;font-weight:600">${events.length} resultado(s) encontrado(s)</div>
      <div class="events-grid">${events.map(e => buildEventCard(e)).join('')}</div>`;
  } catch (err) {
    resultsEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
};

// ════════════════════════════════════════════
// PERFIL PÚBLICO DO ATLETA — #/atleta/:id
// ════════════════════════════════════════════
window.renderAthleteProfile = async function(el, athleteId) {
  el.innerHTML = `<div class="container" style="padding-top:20px"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    // Buscar dados do atleta via admin/athletes e filtrar pelo id
    const athletes = await apiFetch('/admin/athletes');
    const athlete = athletes.find(a => String(a.id) === String(athleteId));
    if (!athlete) throw new Error('Atleta não encontrado.');

    el.innerHTML = `
      <div class="profile-header">
        <button class="back-btn" onclick="history.back()" style="color:rgba(255,255,255,.7);margin-bottom:12px">← Voltar</button>
        <div class="profile-avatar-wrap">
          <div class="profile-avatar">
            ${athlete.avatar ? `<img src="${esc(athlete.avatar)}">` : avatarInitials(athlete.name)}
          </div>
        </div>
        <div class="profile-name">${esc(athlete.name)}</div>
        <span class="profile-role-badge">Atleta</span>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"><div class="profile-stat-val">${athlete.total_registrations || 0}</div><div class="profile-stat-label">Inscrições</div></div>
        <div class="profile-stat"><div class="profile-stat-val">${athlete.paid_registrations || 0}</div><div class="profile-stat-label">Eventos</div></div>
        <div class="profile-stat"><div class="profile-stat-val">${new Date(athlete.created_at).getFullYear()}</div><div class="profile-stat-label">Desde</div></div>
      </div>
      <div class="container" style="padding-top:16px">
        <div class="card mb-12">
          <div class="card-body">
            <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">Contato</div>
            ${athlete.phone ? `<div class="event-meta-row"><span class="icon"></span>${esc(athlete.phone)}</div>` : ''}
            <div class="event-meta-row"><span class="icon"></span>${esc(athlete.email)}</div>
            <div class="event-meta-row" style="margin-top:8px"><span class="icon"></span>Membro desde ${new Date(athlete.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error">${err.message}</div></div>`;
  }
};

// ════════════════════════════════════════════
// DETALHE DA ARENA — #/arenas/:id
// ════════════════════════════════════════════
window.renderArenaDetail = async function(el, arenaId) {
  el.innerHTML = `<div class="container" style="padding-top:20px"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const [arena, allEvents] = await Promise.all([
      apiFetch(`/arenas/${arenaId}`),
      apiFetch('/events')
    ]);
    const arenaEvents = (allEvents || []).filter(e => String(e.arena_id) === String(arenaId));

    el.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--green) 0%,var(--black) 100%);padding:24px 16px 20px;color:var(--white)">
        <button class="back-btn" onclick="navigate('#/arenas')" style="color:rgba(255,255,255,.7);margin-bottom:12px">← Arenas</button>
        <div style="font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:6px">Arena</div>
        <h1 style="font-size:1.8rem;margin-bottom:8px">${esc(arena.name)}</h1>
        <div style="display:flex;flex-direction:column;gap:4px;opacity:.85;font-size:.85rem">
          <div>${esc(arena.address)}, ${esc(arena.city)} — ${esc(arena.state)}</div>
          ${arena.phone ? `<div>${esc(arena.phone)}</div>` : ''}
          ${arena.email ? `<div>${esc(arena.email)}</div>` : ''}
        </div>
      </div>
      <div class="container" style="padding-top:16px">
        ${arena.description ? `
          <div class="card mb-12">
            <div class="card-body">
              <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px">Sobre a arena</div>
              <p style="font-size:.9rem;color:var(--text-secondary)">${esc(arena.description)}</p>
            </div>
          </div>` : ''}

        <!-- Mapa placeholder com link para Google Maps -->
        <a href="https://maps.google.com/?q=${encodeURIComponent(arena.address + ', ' + arena.city + ', ' + arena.state)}" target="_blank" class="map-placeholder mb-12" style="display:flex;text-decoration:none;margin-bottom:16px">
          <div class="map-icon">Mapa</div>
          <div class="map-text">Ver no Google Maps<br><span style="font-size:.75rem;color:var(--text-muted)">${esc(arena.address)}, ${esc(arena.city)}</span></div>
        </a>

        <div class="section-header mb-12">
          <div class="section-title">Eventos nesta arena</div>
          <span style="font-size:.82rem;color:var(--text-muted)">${arenaEvents.length} evento(s)</span>
        </div>
        <div class="events-grid">
          ${arenaEvents.map(e => buildEventCard(e)).join('') || '<div class="empty-state" style="grid-column:1/-1"><p>Nenhum evento cadastrado nesta arena.</p></div>'}
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error">${err.message}</div></div>`;
  }
};

// ════════════════════════════════════════════
// TELA DE ONBOARDING — primeira visita
// ════════════════════════════════════════════
window.showOnboarding = function() {
  if (localStorage.getItem('pg_onboarded')) return;

  const html = `
    <div class="onboarding-overlay" id="onboarding">
      <div class="onboarding-logo">PLAY<span>GAME</span></div>
      <div class="onboarding-tagline">Eventos esportivos de areia</div>
      <div class="onboarding-features">
        <div class="onboarding-feature">
          <div class="feat-icon">V</div>
          <div class="feat-text">
            <div class="feat-title">Vôlei, Futevôlei & Beach Tennis</div>
            <div>Todas as modalidades de areia em um só lugar</div>
          </div>
        </div>
        <div class="onboarding-feature">
          <div class="feat-icon">I</div>
          <div class="feat-text">
            <div class="feat-title">Inscrição simplificada</div>
            <div>Cadastre sua dupla e envie comprovante direto pelo app</div>
          </div>
        </div>
        <div class="onboarding-feature">
          <div class="feat-icon">C</div>
          <div class="feat-text">
            <div class="feat-title">Chaveamento automático</div>
            <div>Geração de confrontos e acompanhamento em tempo real</div>
          </div>
        </div>
        <div class="onboarding-feature">
          <div class="feat-icon">N</div>
          <div class="feat-text">
            <div class="feat-title">Notificações em tempo real</div>
            <div>Receba alertas de inscrições, pagamentos e atualizações</div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;max-width:340px;padding:16px;font-size:1rem" onclick="closeOnboarding()">
        Começar agora →
      </button>
      <div style="margin-top:12px;font-size:.75rem;color:rgba(255,255,255,.3)">PlayGAME v1.1 Beta</div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.closeOnboarding = function() {
  const el = document.getElementById('onboarding');
  if (el) {
    el.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => { el.remove(); navigate('#/login'); }, 300);
  }
  localStorage.setItem('pg_onboarded', '1');
};

// Adicionar animação de fadeOut
const style = document.createElement('style');
style.textContent = '@keyframes fadeOut { to { opacity:0; } }';
document.head.appendChild(style);

// ════════════════════════════════════════════
// SISTEMA DE AVALIAÇÕES PÓS-EVENTO
// ════════════════════════════════════════════
window.openRatingModal = function(eventId, eventTitle) {
  const html = `
    <div class="modal-overlay" id="rating-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Avaliar evento</h2>
          <button class="modal-close" onclick="document.getElementById('rating-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:.9rem;color:var(--text-secondary);margin-bottom:16px">${eventTitle}</div>
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:.82rem;font-weight:700;color:var(--text-muted);margin-bottom:10px;letter-spacing:.05em;text-transform:uppercase">Sua avaliação geral</div>
            <div id="star-row" style="display:flex;justify-content:center;gap:8px;font-size:2rem;cursor:pointer">
              ${[1,2,3,4,5].map(i=>`<span class="star" data-val="${i}" onclick="setRating(${i})" style="opacity:.3;transition:all .2s">★</span>`).join('')}
            </div>
            <div id="rating-label" style="font-size:.82rem;color:var(--text-muted);margin-top:6px;min-height:18px"></div>
            <input type="hidden" id="rating-val" value="0">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            ${[['Organização','org'],['Arena','arena'],['Arbitragem','arb'],['Nível técnico','nivel']].map(([label,key])=>`
              <div style="background:var(--gray-light);border-radius:var(--radius-sm);padding:10px;text-align:center">
                <div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">${label}</div>
                <div style="display:flex;justify-content:center;gap:4px">
                  ${[1,2,3,4,5].map(i=>`<span class="mini-star" data-cat="${key}" data-val="${i}" onclick="setMiniRating('${key}',${i})" style="cursor:pointer;font-size:1rem;opacity:.3">★</span>`).join('')}
                </div>
              </div>`).join('')}
          </div>
          <div class="form-group">
            <label class="form-label">Comentário (opcional)</label>
            <textarea class="form-control" id="rating-comment" placeholder="Compartilhe sua experiência..." style="min-height:80px"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('rating-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="submitRating(${eventId})">Enviar avaliação</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

const ratingLabels = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente!'];
window.setRating = function(val) {
  document.getElementById('rating-val').value = val;
  document.querySelectorAll('.star').forEach(s => {
    s.style.opacity = parseInt(s.dataset.val) <= val ? '1' : '.3';
  });
  document.getElementById('rating-label').textContent = ratingLabels[val] || '';
};
window.setMiniRating = function(cat, val) {
  document.querySelectorAll(`.mini-star[data-cat="${cat}"]`).forEach(s => {
    s.style.opacity = parseInt(s.dataset.val) <= val ? '1' : '.3';
  });
};
window.submitRating = function(eventId) {
  const val = document.getElementById('rating-val').value;
  if (!val || val === '0') { toast('Selecione uma avaliação!', 'error'); return; }
  // Por ora salva só localmente (extensível para API futura)
  const ratings = JSON.parse(localStorage.getItem('pg_ratings') || '{}');
  ratings[eventId] = { rating: val, comment: document.getElementById('rating-comment').value, date: new Date().toISOString() };
  localStorage.setItem('pg_ratings', JSON.stringify(ratings));
  document.getElementById('rating-modal').remove();
  toast('Avaliação enviada! Obrigado!', 'success');
};

// ════════════════════════════════════════════
// WIDGET DE COMPARTILHAMENTO DO EVENTO
// ════════════════════════════════════════════
window.buildShareWidget = function(ev) {
  const url = `${window.location.origin}/#/eventos/${ev.id}`;
  const text = `${ev.title} — ${getModalityLabel(ev.modality)} em ${ev.arena_name}. Inscrições abertas!`;
  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
      <button class="share-btn" onclick="shareEvent('${ev.title.replace(/'/g,"\\'")}', ${ev.id})">
        Compartilhar
      </button>
      <button class="share-btn" onclick="copyEventLink(${ev.id})">
        Copiar link
      </button>
      <a class="share-btn" href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank">
        WhatsApp
      </a>
    </div>`;
};

window.copyEventLink = async function(eventId) {
  const url = `${window.location.origin}/#/eventos/${eventId}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiado!', 'success');
  } catch {
    toast('Não foi possível copiar. URL: ' + url, 'info');
  }
};

// ════════════════════════════════════════════
// TELA DE CONFIGURAÇÕES DO EVENTO (organizador)
// Adiciona opções avançadas: chave PIX, regras rápidas
// ════════════════════════════════════════════
window.renderEventSettings = async function(el, eventId) {
  const user = getUser();
  if (user?.role !== 'organizador') return navigate('#/');

  el.innerHTML = `<div class="container" style="padding-top:20px"><div class="loading"><div class="spinner"></div></div></div>`;
  try {
    const ev = await apiFetch(`/events/${eventId}`);

    el.innerHTML = `
      <div style="background:var(--black);padding:16px 16px 12px">
        <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7);margin-bottom:8px">← Voltar ao evento</button>
        <h1 style="color:var(--white);font-size:1.6rem">Config. do Evento</h1>
        <div style="color:rgba(255,255,255,.5);font-size:.82rem;margin-top:2px">${ev.title}</div>
      </div>
      <div class="container" style="padding-top:16px">

        <!-- Chave PIX -->
        <div class="card mb-12">
          <div class="card-body">
            <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">Dados para Pagamento</div>
            <div class="pix-box">
              <div class="pix-icon">PIX</div>
              <div class="pix-title">PIX</div>
              <div class="pix-sub">Adicione sua chave para facilitar o pagamento dos atletas</div>
              <div class="pix-key" id="pix-display">${ev.pix_key || 'Clique para adicionar'}</div>
            </div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Chave PIX</label>
              <input type="text" class="form-control" id="pix-key-input" placeholder="CPF, e-mail, telefone ou chave aleatória" value="${ev.pix_key || ''}">
            </div>
            <button class="btn btn-secondary btn-sm" onclick="savePixKey(${eventId})">Salvar chave PIX</button>
          </div>
        </div>

        <!-- Status do evento -->
        <div class="card mb-12">
          <div class="card-body">
            <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">Status do Evento</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${['confirmado','pendente','encerrado','cancelado'].map(s => `
                <button class="btn ${ev.status===s?'btn-primary':'btn-outline'} btn-sm" onclick="quickChangeStatus(${eventId},'${s}')">
                  ${s.charAt(0).toUpperCase()+s.slice(1)}
                </button>`).join('')}
            </div>
          </div>
        </div>

        <!-- Zona de perigo -->
        <div class="card" style="border-color:#fca5a5">
          <div class="card-body">
            <div style="font-size:.78rem;font-weight:700;color:var(--red);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">Zona de Perigo</div>
            <button class="btn btn-danger btn-block" onclick="deleteEvent(${eventId})">Excluir evento permanentemente</button>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error">${err.message}</div></div>`;
  }
};

window.savePixKey = async function(eventId) {
  const key = document.getElementById('pix-key-input')?.value;
  if (!key) return;
  try {
    await apiFetch(`/events/${eventId}/pix`, { method: 'PUT', body: JSON.stringify({ pix_key: key }) });
    const display = document.getElementById('pix-display');
    if (display) display.textContent = key;
    toast('Chave PIX salva!', 'success');
  } catch (err) { toast(err.message, 'error'); }
};

window.quickChangeStatus = async function(eventId, status) {
  try {
    const ev = await apiFetch(`/events/${eventId}`);
    await apiFetch(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...ev, status })
    });
    toast(`Status alterado para: ${status}`, 'success');
    navigate(`#/config-evento/${eventId}`);
  } catch (err) { toast(err.message, 'error'); }
};

// ════════════════════════════════════════════
// TELA DE DETALHES DO EVENTO — versão melhorada
// com chave PIX, share, rating e organizer actions
// ════════════════════════════════════════════
// Intercepta buildEventDetailHTML para adicionar conteúdo extra
const _baseDetailHTML = window.buildEventDetailHTML;
window.buildEventDetailHTML = function(ev, user, isOwner, myReg) {
  const base = _baseDetailHTML(ev, user, isOwner, myReg);

  // Injetar PIX box se houver chave salva e atleta tiver inscrição
  const pixKey = ev.pix_key;
  const pixBox = pixKey && myReg && myReg.payment_status !== 'pago' ? `
    <div class="pix-box" style="margin-top:16px">
      <div class="pix-icon">PIX</div>
      <div class="pix-title">Pague via PIX</div>
      <div class="pix-sub">Envie para a chave abaixo e depois envie o comprovante</div>
      <div class="pix-key" onclick="copyPix('${pixKey.replace(/'/g, "\\'")}')" style="cursor:pointer" title="Clique para copiar">${pixKey}</div>
    </div>` : '';

  // Injetar share widget
  const shareWidget = `
    <div style="margin-top:16px">
      ${buildShareWidget ? buildShareWidget(ev) : ''}
    </div>`;

  // Injetar rating btn se evento passou
  const eventPassed = new Date(ev.event_date) < new Date();
  const ratingBtn = eventPassed && myReg ? `
    <div style="margin-top:12px">
      <button class="btn btn-outline btn-sm btn-block" onclick="openRatingModal(${ev.id}, '${ev.title.replace(/'/g,"\\'")}')">
        Avaliar este evento
      </button>
    </div>` : '';

  // Organizer quick links
  const orgLinks = isOwner ? `
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <a href="#/pagamentos-evento/${ev.id}" class="btn btn-outline btn-sm">Pagamentos</a>
      <a href="#/chaveamento/${ev.id}" class="btn btn-outline btn-sm">Chaveamento</a>
      <a href="#/relatorio/${ev.id}" class="btn btn-outline btn-sm">Relatório</a>
      <a href="#/config-evento/${ev.id}" class="btn btn-outline btn-sm">Configurações</a>
    </div>` : '';

  // Injetar tudo antes do fechamento da última div
  const inject = pixBox + ratingBtn + shareWidget + orgLinks;
  // Inserir antes do último </div></div>
  const insertAt = base.lastIndexOf('</div>');
  return base.slice(0, insertAt) + inject + base.slice(insertAt);
};

window.copyPix = async function(key) {
  try {
    await navigator.clipboard.writeText(key);
    toast('Chave PIX copiada!', 'success');
  } catch { toast('Chave: ' + key, 'info'); }
};

console.log('PlayGAME Extra Pages loaded');
