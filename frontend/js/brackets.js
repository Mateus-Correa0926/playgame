// PlayGAME — Página de Chaveamento (brackets.js)
// Incluir em frontend/js/

window.renderBrackets = async function(el, eventId) {
  el.innerHTML = `
    <div style="background:var(--black);padding:16px">
      <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7)">← Voltar ao evento</button>
      <h1 style="color:var(--white);font-size:1.6rem">Chaveamento</h1>
    </div>
    <div class="container" style="padding-top:16px">
      <div class="loading"><div class="spinner"></div></div>
    </div>`;

  try {
    const [bracketData, eventData] = await Promise.all([
      apiFetch(`/brackets/${eventId}`),
      apiFetch(`/events/${eventId}`)
    ]);
    const user = getUser();
    const isOwner = user?.role === 'organizador' && user?.id === eventData?.organizer_id;
    const content = document.getElementById('page-content');
    if (!content) return;

    content.innerHTML = `
      <div style="background:var(--black);padding:16px 16px 12px">
        <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7);margin-bottom:8px">← Voltar ao evento</button>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h1 style="color:var(--white);font-size:1.6rem;margin-bottom:2px">Chaveamento</h1>
            <div style="color:rgba(255,255,255,.5);font-size:.82rem">${esc(eventData?.title || '')}</div>
          </div>
          ${isOwner ? `<button class="btn btn-primary btn-sm" onclick="generateBracket(${eventId})">Gerar</button>` : ''}
        </div>
      </div>
      <div class="container" style="padding-top:16px" id="bracket-container">
        ${buildBracketHTML(bracketData, isOwner, eventId)}
      </div>`;
  } catch (err) {
    const c = document.getElementById('page-content');
    if (c) c.innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error">${err.message}</div></div>`;
  }
};

function buildBracketHTML(data, isOwner, eventId) {
  const { rounds } = data;
  const roundKeys = Object.keys(rounds || {}).sort((a, b) => a - b);

  if (roundKeys.length === 0) {
    return `
      <div class="empty-state">
        <p>Nenhum chaveamento gerado ainda.</p>
        ${isOwner ? `<button class="btn btn-primary" style="margin-top:14px" onclick="generateBracket(${eventId})">Gerar Chaveamento</button>` : '<p class="text-muted" style="margin-top:8px">Aguarde o organizador gerar o chaveamento.</p>'}
      </div>`;
  }

  const roundNames = { 1: 'Oitavas', 2: 'Quartas de Final', 3: 'Semifinal', 4: 'Final', 5: 'Grande Final' };

  return roundKeys.map(round => {
    const matches = rounds[round];
    const totalRounds = roundKeys.length;
    const roundName = roundNames[parseInt(round)] ||
      (parseInt(round) === totalRounds ? 'Final' : `Rodada ${round}`);

    const matchCards = matches.map(m => buildMatchCard(m, isOwner)).join('');
    return `
      <div class="bracket-round" style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;color:var(--text-primary)">${roundName}</div>
          <div style="flex:1;height:1px;background:var(--gray-border)"></div>
          <span class="status-pill ${matches.every(m=>m.status==='finalizado')?'status-confirmado':'status-pendente'}">${matches.filter(m=>m.status==='finalizado').length}/${matches.length}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">${matchCards}</div>
      </div>`;
  }).join('');
}

function buildMatchCard(m, isOwner) {
  const t1name = esc(m.team1_squad || m.team1_name || (m.team1_partner ? `${m.team1_name} & ${m.team1_partner}` : 'BYE'));
  const t2name = esc(m.team2_squad || m.team2_name || (m.team2_partner ? `${m.team2_name} & ${m.team2_partner}` : 'BYE'));
  const isWin1 = m.winner_reg_id === m.team1_reg_id;
  const isWin2 = m.winner_reg_id === m.team2_reg_id;
  const done = m.status === 'finalizado';

  const statusColor = { aguardando: 'var(--gray-border)', em_andamento: 'var(--orange)', finalizado: 'var(--green)' };

  return `
    <div class="card" style="border-left:4px solid ${statusColor[m.status] || 'var(--gray-border)'}">
      <div class="card-body" style="padding:12px 14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Partida ${m.match_number}${m.court ? ' · Quadra ' + m.court : ''}${m.scheduled_time ? ' · ' + m.scheduled_time : ''}</span>
          <span class="status-pill status-${m.status === 'finalizado' ? 'confirmado' : m.status === 'em_andamento' ? 'pendente' : 'encerrado'}" style="font-size:.65rem">${m.status.replace('_',' ')}</span>
        </div>
        <!-- Time 1 -->
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-border)">
          <div style="width:28px;height:28px;border-radius:50%;background:${isWin1?'var(--green)':'var(--gray-border)'};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:${isWin1?'var(--white)':'var(--text-muted)'}">
            ${m.team1_reg_id ? (isWin1 ? 'W' : '1') : '—'}
          </div>
          <div style="flex:1;font-weight:${isWin1?700:500};font-size:.9rem;color:${isWin1?'var(--green)':done&&!isWin1?'var(--text-muted)':'var(--text-primary)'}">${t1name}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:${isWin1?'var(--green)':'var(--text-primary)'}">${m.team1_score ?? (done ? '—' : '')}</div>
        </div>
        <!-- Time 2 -->
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
          <div style="width:28px;height:28px;border-radius:50%;background:${isWin2?'var(--green)':'var(--gray-border)'};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:${isWin2?'var(--white)':'var(--text-muted)'}">
            ${m.team2_reg_id ? (isWin2 ? 'W' : '2') : '—'}
          </div>
          <div style="flex:1;font-weight:${isWin2?700:500};font-size:.9rem;color:${isWin2?'var(--green)':done&&!isWin2?'var(--text-muted)':'var(--text-primary)'}">${t2name}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:${isWin2?'var(--green)':'var(--text-primary)'}">${m.team2_score ?? (done ? '—' : '')}</div>
        </div>
        ${isOwner && m.status !== 'finalizado' && m.team1_reg_id && m.team2_reg_id ? `
          <div style="margin-top:10px;border-top:1px solid var(--gray-border);padding-top:10px">
            <button class="btn btn-outline btn-sm" style="width:100%" onclick="openMatchResultModal(${JSON.stringify(m).replace(/"/g,'&quot;')})">
              Registrar resultado
            </button>
          </div>` : ''}
      </div>
    </div>`;
}

window.generateBracket = async function(eventId) {
  if (!confirm('Gerar chaveamento com as equipes que já pagaram? O chaveamento existente será substituído.')) return;
  try {
    const data = await apiFetch(`/brackets/${eventId}/generate`, { method: 'POST' });
    toast(data.message, 'success');
    renderBrackets(document.getElementById('page-content'), eventId);
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.openMatchResultModal = function(match) {
  const html = `
    <div class="modal-overlay" id="match-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Registrar Resultado — Partida ${match.match_number}</h2>
          <button class="modal-close" onclick="document.getElementById('match-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin-bottom:20px">
            <div style="text-align:center;font-weight:700;font-size:.9rem">${esc(match.team1_squad || match.team1_name || 'Time 1')}</div>
            <div style="text-align:center;color:var(--text-muted);font-weight:700">VS</div>
            <div style="text-align:center;font-weight:700;font-size:.9rem">${esc(match.team2_squad || match.team2_name || 'Time 2')}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
            <input type="number" class="form-control" id="mr-score1" min="0" placeholder="0" style="text-align:center;font-size:1.5rem;font-weight:800">
            <div style="color:var(--text-muted);font-weight:700;text-align:center">:</div>
            <input type="number" class="form-control" id="mr-score2" min="0" placeholder="0" style="text-align:center;font-size:1.5rem;font-weight:800">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
            <div class="form-group">
              <label class="form-label">Horário</label>
              <input type="time" class="form-control" id="mr-time" value="${match.scheduled_time || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Quadra</label>
              <input type="text" class="form-control" id="mr-court" value="${esc(match.court || '')}" placeholder="Ex: Quadra 1">
            </div>
          </div>
          <div class="form-group" style="margin-top:4px">
            <label class="form-label">Status</label>
            <select class="form-control" id="mr-status">
              <option value="em_andamento">Em andamento</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <div id="winner-selector" style="margin-top:14px;display:none">
            <div class="form-label">Vencedor</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">
              <button class="btn btn-outline" id="win-t1" onclick="selectWinner('t1', ${match.team1_reg_id}, ${match.team2_reg_id})">
                ${esc(match.team1_squad || match.team1_name || 'Time 1')}
              </button>
              <button class="btn btn-outline" id="win-t2" onclick="selectWinner('t2', ${match.team1_reg_id}, ${match.team2_reg_id})">
                ${esc(match.team2_squad || match.team2_name || 'Time 2')}
              </button>
            </div>
          </div>
          <input type="hidden" id="mr-winner" value="">
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('match-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="save-match-btn" onclick="saveMatchResult(${match.id})">Salvar resultado</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('mr-status').addEventListener('change', function() {
    document.getElementById('winner-selector').style.display = this.value === 'finalizado' ? 'block' : 'none';
  });
};

window.selectWinner = function(side, t1id, t2id) {
  document.getElementById('mr-winner').value = side === 't1' ? t1id : t2id;
  document.getElementById('win-t1').className = `btn ${side==='t1'?'btn-secondary':'btn-outline'}`;
  document.getElementById('win-t2').className = `btn ${side==='t2'?'btn-secondary':'btn-outline'}`;
};

window.saveMatchResult = async function(matchId) {
  const status = document.getElementById('mr-status').value;
  const winner = document.getElementById('mr-winner').value;
  if (status === 'finalizado' && !winner) {
    toast('Selecione o vencedor antes de finalizar.', 'error'); return;
  }
  try {
    await apiFetch(`/brackets/match/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify({
        team1_score: parseInt(document.getElementById('mr-score1').value) || 0,
        team2_score: parseInt(document.getElementById('mr-score2').value) || 0,
        winner_reg_id: winner || null,
        status,
        scheduled_time: document.getElementById('mr-time').value,
        court: document.getElementById('mr-court').value
      })
    });
    document.getElementById('match-modal').remove();
    toast('Resultado salvo!', 'success');
    // Re-render current page
    const hash = window.location.hash;
    const eventId = hash.split('/')[2];
    renderBrackets(document.getElementById('page-content'), eventId);
  } catch (err) { toast(err.message, 'error'); }
};
