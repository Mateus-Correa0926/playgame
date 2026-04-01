// PlayGAME — Página de Gestão de Pagamentos (payments.js)

window.renderPaymentsPage = async function(el, eventId) {
  const user = getUser();
  el.innerHTML = `
    <div style="background:var(--black);padding:16px 16px 12px">
      <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7);margin-bottom:8px">← Voltar ao evento</button>
      <h1 style="color:var(--white);font-size:1.6rem">Pagamentos</h1>
    </div>
    <div class="container" style="padding-top:16px"><div class="loading"><div class="spinner"></div></div></div>`;

  try {
    const payments = await apiFetch(`/payments/event/${eventId}`);
    const eventData = await apiFetch(`/events/${eventId}`);
    const paid = payments.filter(p => p.payment_status === 'pago');
    const pending = payments.filter(p => p.payment_status === 'pendente' && p.payment_proof);
    const waiting = payments.filter(p => p.payment_status === 'pendente' && !p.payment_proof);

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div style="background:var(--black);padding:16px 16px 12px">
        <button class="back-btn" onclick="navigate('#/eventos/${eventId}')" style="color:rgba(255,255,255,.7);margin-bottom:8px">← Voltar ao evento</button>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <h1 style="color:var(--white);font-size:1.6rem;margin-bottom:2px">Pagamentos</h1>
            <div style="color:rgba(255,255,255,.5);font-size:.82rem">${esc(eventData?.title || '')}</div>
          </div>
        </div>
      </div>
      <div class="container" style="padding-top:16px">
        <div class="stats-row" style="margin-bottom:20px">
          <div class="stat-card green"><div class="stat-value">${paid.length}</div><div class="stat-label">Confirmados</div></div>
          <div class="stat-card orange"><div class="stat-value">${pending.length}</div><div class="stat-label">Aguard. revisão</div></div>
          <div class="stat-card"><div class="stat-value">${waiting.length}</div><div class="stat-label">Sem comprov.</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(paid.length * parseFloat(eventData?.registration_fee || 0))}</div><div class="stat-label">Receita</div></div>
        </div>

        ${pending.length > 0 ? `
          <div class="section-header mb-12">
            <div class="section-title" style="color:var(--orange)">Aguardando revisão (${pending.length})</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
            ${pending.map(p => buildPaymentCard(p, 'pending', eventData?.registration_fee)).join('')}
          </div>` : ''}

        <div class="section-header mb-12">
          <div class="section-title text-green">Pagamentos confirmados (${paid.length}/${eventData?.participant_limit})</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
          ${paid.map(p => buildPaymentCard(p, 'paid', eventData?.registration_fee)).join('')}
          ${paid.length === 0 ? '<div class="empty-state"><p>Nenhum pagamento confirmado ainda.</p></div>' : ''}
        </div>

        ${waiting.length > 0 ? `
          <div class="section-header mb-12">
            <div class="section-title" style="color:var(--text-muted)">⌒ Aguardando comprovante (${waiting.length})</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${waiting.map(p => buildPaymentCard(p, 'waiting', eventData?.registration_fee)).join('')}
          </div>` : ''}
      </div>`;
  } catch (err) {
    document.getElementById('page-content').innerHTML = `<div class="container" style="padding-top:20px"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
};

function buildPaymentCard(p, type, fee) {
  const hasProof = !!p.payment_proof;
  const regDate = p.payment_confirmed_at || p.created_at;

  return `
    <div class="card">
      <div class="card-body" style="padding:14px 16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="athlete-avatar" style="background:${type==='paid'?'var(--green)':type==='pending'?'var(--orange)':'var(--gray-border)'}">
            ${p.athlete_avatar ? `<img src="${esc(p.athlete_avatar)}" alt="">` : avatarInitials(p.athlete_name)}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.95rem">${esc(p.athlete_name)}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${esc(p.team_name || p.partner_name || 'Individual')}</div>
            <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">
              ${esc(p.athlete_email)} ${p.athlete_phone ? '· ' + esc(p.athlete_phone) : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;color:var(--orange)">${formatCurrency(fee || 0)}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${timeAgo(regDate)}</div>
          </div>
        </div>

        ${hasProof ? `
          <div style="margin-top:10px;padding:8px 10px;background:var(--gray-light);border-radius:var(--radius-sm);display:flex;align-items:center;gap:8px">
            <span style="font-size:1rem"></span>
            <a href="${esc(p.payment_proof)}" target="_blank" style="flex:1;font-size:.82rem;color:var(--orange);font-weight:600;text-decoration:none">Ver comprovante</a>
          </div>` : ''}

        ${type === 'pending' ? `
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-secondary btn-sm" style="flex:1" onclick="approvePayment(${p.id})">Confirmar</button>
            <button class="btn btn-danger btn-sm" style="flex:1" onclick="rejectPayment(${p.id})">Recusar</button>
          </div>` : ''}

        ${type === 'paid' ? `
          <div style="margin-top:10px;padding:6px 10px;background:var(--green-xlight);border-radius:var(--radius-sm);font-size:.78rem;color:var(--green);font-weight:600">
            ✓ Pago em ${p.payment_confirmed_at ? new Date(p.payment_confirmed_at).toLocaleDateString('pt-BR') : '—'}
          </div>` : ''}

        ${type === 'waiting' ? `
          <div style="margin-top:10px">
            <button class="btn btn-outline btn-sm" style="width:100%" onclick="approvePayment(${p.id})">Confirmar mesmo assim</button>
          </div>` : ''}
      </div>
    </div>`;
}

window.approvePayment = async function(regId) {
  if (!confirm('Confirmar este pagamento?')) return;
  try {
    await apiFetch(`/payments/${regId}/approve`, { method: 'PUT' });
    toast('Pagamento confirmado!', 'success');
    const hash = window.location.hash;
    const eid = hash.split('/')[2];
    renderPaymentsPage(document.getElementById('page-content'), eid);
  } catch (err) { toast(err.message, 'error'); }
};

window.rejectPayment = async function(regId) {
  const reason = prompt('Motivo da recusa (opcional):');
  if (reason === null) return;
  try {
    await apiFetch(`/payments/${regId}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) });
    toast('Comprovante recusado e atleta notificado.', 'info');
    const hash = window.location.hash;
    const eid = hash.split('/')[2];
    renderPaymentsPage(document.getElementById('page-content'), eid);
  } catch (err) { toast(err.message, 'error'); }
};

// Upload comprovante (atleta)
window.openProofUploadModal = function(regId) {
  const html = `
    <div class="modal-overlay" id="proof-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Enviar Comprovante</h2>
          <button class="modal-close" onclick="document.getElementById('proof-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info"><span class="alert-icon">i</span>Envie o comprovante de pagamento (PIX, transferência ou depósito). O organizador confirmará em breve.</div>
          <div class="form-group" style="margin-top:14px">
            <label class="form-label">Arquivo (JPG, PNG ou PDF)</label>
            <input type="file" class="form-control" id="proof-file" accept="image/*,.pdf">
          </div>
          <div id="proof-preview" style="display:none;margin-top:10px">
            <img id="proof-img" src="" style="width:100%;border-radius:var(--radius-sm);max-height:200px;object-fit:contain;background:var(--gray-light)">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('proof-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="send-proof-btn" onclick="sendProof(${regId})">Enviar comprovante</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('proof-file').addEventListener('change', function() {
    if (this.files[0] && this.files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('proof-img').src = e.target.result;
        document.getElementById('proof-preview').style.display = 'block';
      };
      reader.readAsDataURL(this.files[0]);
    }
  });
};

window.sendProof = async function(regId) {
  const fileInput = document.getElementById('proof-file');
  if (!fileInput?.files[0]) { toast('Selecione um arquivo.', 'error'); return; }
  const btn = document.getElementById('send-proof-btn');
  btn.disabled = true; btn.textContent = 'Enviando...';

  const form = new FormData();
  form.append('proof', fileInput.files[0]);

  try {
    const res = await fetch(`/api/payments/${regId}/proof`, {
      method: 'POST',
      credentials: 'same-origin',
      body: form
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('proof-modal').remove();
      toast('Comprovante enviado! Aguarde a confirmação.', 'success');
      // Refresh page
      const hash = window.location.hash;
      navigate('#/'); setTimeout(() => navigate(hash), 100);
    } else {
      toast(data.error, 'error');
      btn.disabled = false; btn.textContent = 'Enviar comprovante';
    }
  } catch (err) {
    toast('Erro ao enviar arquivo.', 'error');
    btn.disabled = false; btn.textContent = 'Enviar comprovante';
  }
};
