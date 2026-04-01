// PlayGAME — Extended Features (app-extended.js)
// Carregado após app.js — adiciona funcionalidades avançadas

// ── EDIT EVENT MODAL ──
window.openEditEventModal = async function(eventId) {
  let ev, arenas;
  try {
    [ev, arenas] = await Promise.all([apiFetch(`/events/${eventId}`), apiFetch('/arenas')]);
  } catch (err) { toast(err.message, 'error'); return; }

  const arenaOptions = arenas.map(a =>
    `<option value="${a.id}" ${a.id === ev.arena_id ? 'selected' : ''}>${a.name} — ${a.city}</option>`
  ).join('');
  const modalityOptions = MODALITIES.map(m =>
    `<option value="${m}" ${m === ev.modality ? 'selected' : ''}>${getModalityLabel(m)}</option>`
  ).join('');

  const html = `
    <div class="modal-overlay" id="edit-event-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Editar Evento</h2>
          <button class="modal-close" onclick="document.getElementById('edit-event-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nome do evento *</label>
            <input type="text" class="form-control" id="ee-title" value="${esc(ev.title || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Modalidade *</label>
            <select class="form-control" id="ee-modality">${modalityOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Arena *</label>
            <select class="form-control" id="ee-arena">${arenaOptions}</select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Data *</label>
              <input type="date" class="form-control" id="ee-date" value="${ev.event_date ? ev.event_date.slice(0,10) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Horário *</label>
              <input type="time" class="form-control" id="ee-time" value="${ev.start_time ? ev.start_time.slice(0,5) : ''}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Valor (R$)</label>
              <input type="number" class="form-control" id="ee-fee" value="${ev.registration_fee || 0}" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">Limite pagantes</label>
              <input type="number" class="form-control" id="ee-limit" value="${ev.participant_limit || 16}" min="2">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="ee-status">
              <option value="pendente" ${ev.status==='pendente'?'selected':''}>Pendente</option>
              <option value="confirmado" ${ev.status==='confirmado'?'selected':''}>Confirmado</option>
              <option value="cancelado" ${ev.status==='cancelado'?'selected':''}>Cancelado</option>
              <option value="encerrado" ${ev.status==='encerrado'?'selected':''}>Encerrado</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-control" id="ee-desc">${esc(ev.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Regras</label>
            <textarea class="form-control" id="ee-rules" style="min-height:120px">${esc(ev.rules || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('edit-event-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="save-event-btn">Salvar alterações</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('save-event-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-event-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await apiFetch(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: document.getElementById('ee-title').value,
          modality: document.getElementById('ee-modality').value,
          arena_id: document.getElementById('ee-arena').value,
          event_date: document.getElementById('ee-date').value,
          start_time: document.getElementById('ee-time').value,
          registration_fee: document.getElementById('ee-fee').value,
          participant_limit: document.getElementById('ee-limit').value,
          status: document.getElementById('ee-status').value,
          description: document.getElementById('ee-desc').value,
          rules: document.getElementById('ee-rules').value
        })
      });
      document.getElementById('edit-event-modal').remove();
      toast('Evento atualizado!', 'success');
      navigate(`#/eventos/${eventId}`);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Salvar alterações';
    }
  });
};

// ── EDIT REGISTRATION MODAL ──
window.openEditRegModal = async function(regId) {
  const html = `
    <div class="modal-overlay" id="edit-reg-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Editar Dados da Dupla</h2>
          <button class="modal-close" onclick="document.getElementById('edit-reg-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nome da equipe</label>
            <input type="text" class="form-control" id="er-team" placeholder="Nome da equipe">
          </div>
          <div class="form-group">
            <label class="form-label">Nome do parceiro/a</label>
            <input type="text" class="form-control" id="er-partner" placeholder="Nome completo">
          </div>
          <div class="form-group">
            <label class="form-label">E-mail do parceiro/a</label>
            <input type="email" class="form-control" id="er-pemail" placeholder="email@parceiro.com">
          </div>
          <div class="form-group">
            <label class="form-label">Telefone do parceiro/a</label>
            <input type="tel" class="form-control" id="er-pphone" placeholder="(11) 99999-9999">
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea class="form-control" id="er-notes" placeholder="Informações adicionais..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('edit-reg-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="save-reg-btn">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('save-reg-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-reg-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await apiFetch(`/registrations/${regId}`, {
        method: 'PUT',
        body: JSON.stringify({
          team_name: document.getElementById('er-team').value,
          partner_name: document.getElementById('er-partner').value,
          partner_email: document.getElementById('er-pemail').value,
          partner_phone: document.getElementById('er-pphone').value,
          notes: document.getElementById('er-notes').value
        })
      });
      document.getElementById('edit-reg-modal').remove();
      toast('Dados atualizados!', 'success');
      const hash = window.location.hash;
      navigate('#/');
      setTimeout(() => navigate(hash), 100);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  });
};

// ── BANNER UPLOAD para Evento ──
window.uploadEventBanner = async function(input, eventId) {
  if (!input.files[0]) return;
  const form = new FormData();
  form.append('banner', input.files[0]);
  try {
    const res = await fetch(`/api/events/${eventId}/banner`, {
      method: 'POST',
      credentials: 'same-origin',
      body: form
    });
    const data = await res.json();
    if (res.ok) {
      toast('Banner atualizado!', 'success');
      navigate(`#/eventos/${eventId}`);
    } else { toast(data.error, 'error'); }
  } catch (err) { toast('Erro ao enviar banner.', 'error'); }
};

// ── SEARCH / FILTER GLOBAL ──
window.initSearchBar = function() {
  const bar = document.getElementById('global-search');
  if (!bar) return;
  bar.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.event-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
};

// ── PULL TO REFRESH (mobile UX) ──
(function initPullToRefresh() {
  let startY = 0, pulling = false;
  document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 100 && window.scrollY === 0) {
      toast('Atualizando...', 'info');
      setTimeout(() => render(), 400);
    }
  }, { passive: true });
})();

// ── OFFLINE DETECTION ──
window.addEventListener('online', () => toast('Conexão restaurada ✓', 'success'));
window.addEventListener('offline', () => toast('Sem conexão com a internet', 'error'));

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    const panel = document.getElementById('notif-panel');
    if (panel) panel.remove();
  }
});

// ── SMOOTH PAGE TRANSITIONS ──
const originalRender = window.render;
if (originalRender) {
  const content = document.getElementById('page-content');
  if (content) {
    content.style.transition = 'opacity 0.15s ease';
  }
}

// ── FORMAT PHONE INPUT ──
document.addEventListener('input', e => {
  if (e.target.type === 'tel') {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length <= 10) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    e.target.value = v.trim().replace(/-$/, '');
  }
});

// ── BACK BUTTON SUPPORT ──
window.addEventListener('popstate', () => render());

// ── DEEP LINK HANDLER ──
(function handleDeepLinks() {
  const hash = window.location.hash;
  if (hash && hash !== '#/' && hash !== '#') {
    if (!getUser()) {
      localStorage.setItem('pg_redirect', hash);
    }
  }
  // After login, redirect to saved deep link
  const savedRedirect = localStorage.getItem('pg_redirect');
  if (savedRedirect && getUser()) {
    localStorage.removeItem('pg_redirect');
    setTimeout(() => navigate(savedRedirect), 300);
  }
})();

console.log('PlayGAME Extended Features loaded');
