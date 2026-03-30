// backend/routes/payments.js
// Gerenciamento de pagamentos com upload de comprovante

const express = require('express');
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

// Multer para comprovante de pagamento
const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `proof_reg${req.params.regId}_${Date.now()}${ext}`);
  }
});
const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// POST /api/payments/:regId/proof — atleta envia comprovante
router.post('/:regId/proof', authMiddleware, requireRole('atleta'), uploadProof.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo inválido. Use JPG, PNG ou PDF.' });

  try {
    const { rows } = await pool.query(
      'SELECT r.*, e.title, e.organizer_id FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=$1 AND r.athlete_id=$2',
      [req.params.regId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });

    const proofPath = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE registrations SET payment_proof=$1 WHERE id=$2', [proofPath, req.params.regId]);

    // Notificar organizador
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, 'payment', $2, $3, $4)`,
      [rows[0].organizer_id,
       '💰 Comprovante enviado!',
       `${req.user.name} enviou comprovante para "${rows[0].title}".`,
       rows[0].event_id]
    );

    res.json({ message: 'Comprovante enviado com sucesso! Aguarde a confirmação do organizador.', proof: proofPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar comprovante.' });
  }
});

// GET /api/payments/event/:eventId — organizador vê todos pagamentos de um evento
router.get('/event/:eventId', authMiddleware, requireRole('organizador'), async (req, res) => {
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

// PUT /api/payments/:regId/approve — organizador aprova
router.put('/:regId/approve', authMiddleware, requireRole('organizador'), async (req, res) => {
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

    await pool.query(
      'UPDATE registrations SET payment_status=\'pago\', payment_confirmed_at=NOW() WHERE id=$1',
      [req.params.regId]
    );

    // Notificar atleta
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, 'payment', $2, $3, $4)`,
      [r.athlete_id, '✅ Pagamento confirmado!', `Sua inscrição em "${r.title}" foi confirmada!`, r.event_id]
    );

    res.json({ message: 'Pagamento aprovado!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar pagamento.' });
  }
});

// PUT /api/payments/:regId/reject — organizador rejeita
router.put('/:regId/reject', authMiddleware, requireRole('organizador'), async (req, res) => {
  const { reason } = req.body;
  try {
    const { rows } = await pool.query(
      `SELECT r.*, e.title, e.organizer_id FROM registrations r
       JOIN events e ON e.id=r.event_id WHERE r.id=$1 AND e.organizer_id=$2`,
      [req.params.regId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Registro não encontrado.' });

    await pool.query(
      'UPDATE registrations SET payment_status=\'pendente\', payment_proof=NULL WHERE id=$1',
      [req.params.regId]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, 'payment', $2, $3, $4)`,
      [rows[0].athlete_id,
       '❌ Comprovante recusado',
       `Seu comprovante em "${rows[0].title}" foi recusado. ${reason ? 'Motivo: ' + reason : 'Envie novamente.'}`,
       rows[0].event_id]
    );

    res.json({ message: 'Pagamento rejeitado e atleta notificado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rejeitar pagamento.' });
  }
});

module.exports = router;
