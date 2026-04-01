// backend/routes/payments.js
// Gerenciamento de pagamentos com upload de comprovante

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { paramRegId, paramEventId, rejectRules } = require('../middleware/validate');
const router = express.Router();

// Helper: remove arquivo antigo com segurança
function removeOldFile(filePath) {
  if (!filePath) return;
  const full = path.join(__dirname, '../../', filePath);
  const resolved = path.resolve(full);
  const uploadsDir = path.resolve(path.join(__dirname, '../../uploads'));
  if (!resolved.startsWith(uploadsDir)) return;
  fs.unlink(resolved, () => {});
}

// Helper: registra mudança de status no log unificado
async function logPaymentChange(regId, oldStatus, newStatus, userId, reason) {
  try {
    await pool.query(
      'INSERT INTO payment_status_log (registration_id, old_status, new_status, changed_by, reason) VALUES ($1,$2,$3,$4,$5)',
      [regId, oldStatus, newStatus, userId, reason || null]
    );
  } catch (e) { console.error('[payment_log]', e.message); }
}

// Multer para comprovante de pagamento
const ALLOWED_MIMES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    // Use MIME-based extension instead of user-supplied filename
    const ext = ALLOWED_MIMES[file.mimetype] || '.bin';
    cb(null, `proof_reg${req.params.regId}_${Date.now()}${ext}`);
  }
});
const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES[file.mimetype]) {
      return cb(new Error('Tipo de arquivo inválido. Use JPG, PNG, WebP ou PDF.'));
    }
    cb(null, true);
  }
});

// POST /api/payments/:regId/proof — atleta envia comprovante
router.post('/:regId/proof', authMiddleware, requireRole('atleta'), paramRegId, uploadProof.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo inválido. Use JPG, PNG ou PDF.' });

  try {
    const { rows } = await pool.query(
      'SELECT r.*, e.title, e.organizer_id FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=$1 AND r.athlete_id=$2',
      [req.params.regId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });

    // Remover comprovante antigo se existir
    removeOldFile(rows[0].payment_proof);

    const proofPath = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE registrations SET payment_proof=$1 WHERE id=$2', [proofPath, req.params.regId]);

    await logPaymentChange(req.params.regId, rows[0].payment_status, rows[0].payment_status, req.user.id, 'Comprovante enviado');
    auditLog('payment.proof_upload', req.user.id, { reg_id: req.params.regId, event_id: rows[0].event_id }, req);

    // Notificar organizador
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, 'payment', $2, $3, $4)`,
      [rows[0].organizer_id, 'Comprovante enviado!', `${req.user.name} enviou comprovante para "${rows[0].title}".`, rows[0].event_id]
    );

    res.json({ message: 'Comprovante enviado com sucesso! Aguarde a confirmação do organizador.', proof: proofPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar comprovante.' });
  }
});

// GET /api/payments/event/:eventId — organizador vê todos pagamentos de um evento
router.get('/event/:eventId', authMiddleware, requireRole('organizador'), paramEventId, async (req, res) => {
  try {
    const { rows: check } = await pool.query('SELECT id FROM events WHERE id=$1 AND organizer_id=$2', [req.params.eventId, req.user.id]);
    if (check.length === 0) return res.status(403).json({ error: 'Sem permissão.' });

    const { rows } = await pool.query(`
      SELECT r.*, u.name as athlete_name, u.email as athlete_email, u.phone as athlete_phone, u.avatar as athlete_avatar
      FROM registrations r
      JOIN users u ON u.id = r.athlete_id
      WHERE r.event_id = $1
      ORDER BY r.payment_status ASC, r.created_at ASC
    `, [req.params.eventId]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
  }
});

// GET /api/payments/:regId/history — histórico de mudanças de status
router.get('/:regId/history', authMiddleware, paramRegId, async (req, res) => {
  try {
    // Atleta dono ou organizador do evento
    const { rows: reg } = await pool.query(
      `SELECT r.athlete_id, e.organizer_id FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=$1`,
      [req.params.regId]
    );
    if (reg.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    if (reg[0].athlete_id !== req.user.id && reg[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }

    const { rows } = await pool.query(
      `SELECT psl.*, u.name as changed_by_name FROM payment_status_log psl
       LEFT JOIN users u ON u.id=psl.changed_by
       WHERE psl.registration_id=$1 ORDER BY psl.created_at ASC`,
      [req.params.regId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// PUT /api/payments/:regId/approve — organizador aprova
router.put('/:regId/approve', authMiddleware, requireRole('organizador'), paramRegId, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, e.title, e.organizer_id, e.participant_limit,
        (SELECT COUNT(*)::int FROM registrations WHERE event_id=r.event_id AND payment_status='pago') as paid_count
       FROM registrations r JOIN events e ON e.id=r.event_id
       WHERE r.id=$1 AND e.organizer_id=$2`,
      [req.params.regId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Registro não encontrado.' });

    const r = rows[0];
    if (r.paid_count >= r.participant_limit) {
      return res.status(400).json({ error: `Limite de ${r.participant_limit} participantes pagos já atingido.` });
    }

    const oldStatus = r.payment_status;
    await pool.query(
      'UPDATE registrations SET payment_status=\'pago\', payment_confirmed_at=NOW() WHERE id=$1',
      [req.params.regId]
    );

    await logPaymentChange(req.params.regId, oldStatus, 'pago', req.user.id, 'Aprovado pelo organizador');
    auditLog('payment.approve', req.user.id, { reg_id: req.params.regId, event_id: r.event_id, athlete_id: r.athlete_id }, req);

    // Notificar atleta
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, 'payment', $2, $3, $4)`,
      [r.athlete_id, 'Pagamento confirmado!', `Sua inscrição em "${r.title}" foi confirmada!`, r.event_id]
    );

    res.json({ message: 'Pagamento aprovado!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar pagamento.' });
  }
});

// PUT /api/payments/:regId/reject — organizador rejeita
router.put('/:regId/reject', authMiddleware, requireRole('organizador'), rejectRules, async (req, res) => {
  const { reason } = req.body;
  try {
    const { rows } = await pool.query(
      `SELECT r.*, e.title, e.organizer_id FROM registrations r
       JOIN events e ON e.id=r.event_id WHERE r.id=$1 AND e.organizer_id=$2`,
      [req.params.regId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Registro não encontrado.' });

    const oldStatus = rows[0].payment_status;
    // Remover comprovante recusado do disco
    removeOldFile(rows[0].payment_proof);
    await pool.query(
      'UPDATE registrations SET payment_status=\'pendente\', payment_proof=NULL WHERE id=$1',
      [req.params.regId]
    );

    await logPaymentChange(req.params.regId, oldStatus, 'pendente', req.user.id, reason || 'Recusado pelo organizador');
    auditLog('payment.reject', req.user.id, { reg_id: req.params.regId, event_id: rows[0].event_id, reason }, req);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, 'payment', $2, $3, $4)`,
      [rows[0].athlete_id, 'Comprovante recusado', `Seu comprovante em "${rows[0].title}" foi recusado. ${reason ? 'Motivo: ' + reason : 'Envie novamente.'}`, rows[0].event_id]
    );

    res.json({ message: 'Pagamento rejeitado e atleta notificado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rejeitar pagamento.' });
  }
});

// GET /api/payments/proof/:regId — download protegido do comprovante (dono ou organizador)
router.get('/proof/:regId', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.payment_proof, r.athlete_id, e.organizer_id
       FROM registrations r JOIN events e ON e.id=r.event_id
       WHERE r.id=$1`,
      [req.params.regId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    const reg = rows[0];
    if (reg.athlete_id !== req.user.id && reg.organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão para acessar este comprovante.' });
    }
    if (!reg.payment_proof) return res.status(404).json({ error: 'Nenhum comprovante enviado.' });

    const filePath = path.join(__dirname, '../../', reg.payment_proof);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar comprovante.' });
  }
});

module.exports = router;
