// PlayGAME — Relatório de Evento (report.js)

window.renderEventReport = async function(el, eventId) {
  el.innerHTML = `
    <div style="background:var(--black);padding:16px">
      <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7)">← Voltar ao evento</button>
      <h1 style="color:var(--white);font-size:1.6rem">Relatório do Evento</h1>
    </div>
    <div class="container" style="padding-top:16px"><div class="loading"><div class="spinner"></div></div></div>`;

  try {
    const report = await apiFetch(`/admin/event/${eventId}/report`);
    const { event: ev, summary, paid_list, pending_list, comments } = report;

    document.getElementById('page-content').innerHTML = `
      <div style="background:var(--black);padding:16px 16px 12px">
        <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7);margin-bottom:8px">← Voltar ao evento</button>
        <h1 style="color:var(--white);font-size:1.6rem;margin-bottom:2px">Relatório</h1>
        <div style="color:rgba(255,255,255,.5);font-size:.82rem">${esc(ev.title)}</div>
      </div>
      <div class="container" style="padding-top:16px">

        <!-- Resumo Geral -->
        <div class="stats-row" style="margin-bottom:20px">
          <div class="stat-card orange"><div class="stat-value">${summary.total_registrations}</div><div class="stat-label">Total inscritos</div></div>
          <div class="stat-card green"><div class="stat-value">${summary.paid}</div><div class="stat-label">Pagos</div></div>
          <div class="stat-card"><div class="stat-value">${summary.pending}</div><div class="stat-label">Pendentes</div></div>
          <div class="stat-card"><div class="stat-value">${summary.spots_remaining}</div><div class="stat-label">Vagas livres</div></div>
        </div>

        <!-- Receita e Ocupação -->
        <div class="card mb-12">
          <div class="card-body">
            <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">Financeiro & Ocupação</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <div style="font-size:.8rem;color:var(--text-muted)">Receita confirmada</div>
                <div style="font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:800;color:var(--orange)">${formatCurrency(summary.revenue)}</div>
              </div>
              <div>
                <div style="font-size:.8rem;color:var(--text-muted)">Receita potencial</div>
                <div style="font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:800;color:var(--text-muted)">${formatCurrency(summary.total_registrations * parseFloat(ev.registration_fee))}</div>
              </div>
            </div>
            <div style="margin-top:14px">
              <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px">
                <span>Ocupação de vagas pagas</span>
                <span style="font-weight:700">${summary.fill_pct}%</span>
              </div>
              <div style="height:8px;background:var(--gray-border);border-radius:8px;overflow:hidden">
                <div style="height:100%;width:${summary.fill_pct}%;background:${summary.fill_pct>=90?'var(--red)':summary.fill_pct>=70?'var(--orange)':'var(--green)'};transition:width .5s;border-radius:8px"></div>
              </div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:3px">${summary.paid} pagos de ${ev.participant_limit} vagas disponíveis</div>
            </div>
          </div>
        </div>

        <!-- Info do Evento -->
        <div class="card mb-12">
          <div class="card-body">
            <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">Detalhes do Evento</div>
            <div class="info-grid">
              <div class="info-item"><div class="info-item-label">Modalidade</div><div class="info-item-val">${getModalityLabel(ev.modality)}</div></div>
              <div class="info-item"><div class="info-item-label">Data</div><div class="info-item-val">${formatDate(ev.event_date)}</div></div>
              <div class="info-item"><div class="info-item-label">Horário</div><div class="info-item-val">${(ev.start_time||'').slice(0,5)}</div></div>
              <div class="info-item"><div class="info-item-label">Status</div><div class="info-item-val"><span class="status-pill status-${ev.status}">${ev.status}</span></div></div>
              <div class="info-item"><div class="info-item-label">Arena</div><div class="info-item-val">${esc(ev.arena_name)}</div></div>
              <div class="info-item"><div class="info-item-label">Inscrição</div><div class="info-item-val">${formatCurrency(ev.registration_fee)}</div></div>
            </div>
          </div>
        </div>

        <!-- Tabs: Pagos / Pendentes / Comentários -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="rpt-paid">Pagos (${summary.paid})</button>
          <button class="tab-btn" data-tab="rpt-pending">Pendentes (${summary.pending})</button>
          <button class="tab-btn" data-tab="rpt-comments">Comentários (${comments.length})</button>
        </div>

        <div id="tab-rpt-paid" class="tab-content">
          ${paid_list.length > 0
            ? `<div class="athlete-list">${paid_list.map(r => buildReportAthleteRow(r, 'paid')).join('')}</div>`
            : '<div class="empty-state"><p>Nenhum pagamento confirmado.</p></div>'}
        </div>

        <div id="tab-rpt-pending" class="tab-content" style="display:none">
          ${pending_list.length > 0
            ? `<div class="athlete-list">${pending_list.map(r => buildReportAthleteRow(r, 'pending')).join('')}</div>`
            : '<div class="empty-state"><p>Nenhum inscrito pendente.</p></div>'}
        </div>

        <div id="tab-rpt-comments" class="tab-content" style="display:none">
          <div class="comment-list">
            ${comments.map(c => `
              <div class="comment-item">
                <div class="comment-avatar">${avatarInitials(c.user_name)}</div>
                <div class="comment-bubble ${c.user_role==='organizador'?'org':''}">
                  <div class="comment-meta"><strong>${esc(c.user_name)}</strong><span>${timeAgo(c.created_at)}</span><span class="status-pill status-${c.user_role==='organizador'?'confirmado':'pendente'}" style="font-size:.65rem">${esc(c.user_role)}</span></div>
                  <div class="comment-text">${esc(c.message)}</div>
                </div>
              </div>`).join('') || '<div class="empty-state"><p>Nenhum comentário ainda.</p></div>'}
          </div>
        </div>

        <!-- Ações rápidas -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">
          <button class="btn btn-primary btn-sm" onclick="navigate('#/pagamentos-evento/${eventId}')">Gerenciar Pagamentos</button>
          <button class="btn btn-secondary btn-sm" onclick="navigate('#/chaveamento/${eventId}')">Chaveamento</button>
          <button class="btn btn-outline btn-sm" onclick="window.print()">Imprimir</button>
        </div>
      </div>`;

    // Bind tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        const tab = btn.getAttribute('data-tab');
        const tabEl = document.getElementById(`tab-${tab}`);
        if (tabEl) tabEl.style.display = 'block';
      });
    });

  } catch (err) {
    document.getElementById('page-content').innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error"><span class="alert-icon">!</span>${esc(err.message)}</div></div>`;
  }
};

function buildReportAthleteRow(r, type) {
  return `
    <div class="athlete-item">
      <div class="athlete-avatar" style="background:${type==='paid'?'var(--green)':'var(--orange)'}">
        ${r.athlete_avatar ? `<img src="${esc(r.athlete_avatar)}">` : avatarInitials(r.athlete_name)}
      </div>
      <div class="athlete-info">
        <div class="athlete-name">${esc(r.athlete_name)}</div>
        <div class="athlete-sub">${esc(r.team_name || r.partner_name || 'Individual')} ${r.athlete_phone ? '· ' + esc(r.athlete_phone) : ''}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${esc(r.athlete_email)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <span class="athlete-status-badge ${type==='paid'?'badge-paid':'badge-pending'}">${type==='paid'?'✓ Pago':'Pendente'}</span>
        <div style="font-size:.7rem;color:var(--text-muted);margin-top:3px">${timeAgo(r.created_at)}</div>
      </div>
    </div>`;
}
