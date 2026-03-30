// backend/routes/registrations.js
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { registrationRules } = require('../middleware/validate');
const router = express.Router();

// POST /api/registrations — atleta se inscreve (auto-fill from profile)
router.post('/', authMiddleware, requireRole('atleta'), registrationRules, async (req, res) => {
  const { event_id, partner_name, partner_email, partner_phone, team_name, notes } = req.body;

  try {
    // Check profile completeness
    const { rows: profile } = await pool.query(
      'SELECT name, phone, cpf, birth_date, gender, city, state FROM users WHERE id=$1',
      [req.user.id]
    );
    const u = profile[0];
    const requiredFields = ['name', 'phone', 'cpf', 'birth_date', 'gender', 'city', 'state'];
    const missing = requiredFields.filter(f => !u[f]);
    if (missing.length > 0) {
      return res.status(422).json({
        error: 'Complete seu perfil antes de se inscrever.',
        missing,
        code: 'INCOMPLETE_PROFILE'
      });
    }

    // Verificar se já está inscrito
    const { rows: existing } = await pool.query(
      'SELECT id FROM registrations WHERE event_id=$1 AND athlete_id=$2',
      [event_id, req.user.id]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Você já está inscrito neste evento.' });

    const { rows: [{ id }] } = await pool.query(
      `INSERT INTO registrations (event_id, athlete_id, partner_name, partner_email, partner_phone, team_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [event_id, req.user.id, partner_name || null, partner_email || null, partner_phone || null, team_name || null, notes || null]
    );

    // Notificar organizador
    const { rows: event } = await pool.query('SELECT organizer_id, title FROM events WHERE id=$1', [event_id]);
    if (event.length > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, \'registration\', $2, $3, $4)',
        [event[0].organizer_id, 'Nova inscrição!', `${req.user.name} se inscreveu em "${event[0].title}".`, event_id]
      );
    }

    res.status(201).json({ message: 'Inscrição realizada com sucesso!', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao realizar inscrição.' });
  }
});

// PUT /api/registrations/:id — atleta edita dados da dupla
router.put('/:id', authMiddleware, requireRole('atleta'), async (req, res) => {
  const { partner_name, partner_email, partner_phone, team_name, notes } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM registrations WHERE id=$1 AND athlete_id=$2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });

    await pool.query(
      'UPDATE registrations SET partner_name=$1, partner_email=$2, partner_phone=$3, team_name=$4, notes=$5 WHERE id=$6',
      [partner_name, partner_email, partner_phone, team_name, notes, req.params.id]
    );
    res.json({ message: 'Dados atualizados com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar inscrição.' });
  }
});

// DELETE /api/registrations/:id — atleta sai do evento
router.delete('/:id', authMiddleware, requireRole('atleta'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM registrations WHERE id=$1 AND athlete_id=$2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });

    await pool.query('DELETE FROM registrations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Você saiu do evento com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar inscrição.' });
  }
});

// PUT /api/registrations/:id/confirm-payment — organizador confirma pagamento
router.put('/:id/confirm-payment', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, e.organizer_id, e.title as event_title 
       FROM registrations r JOIN events e ON e.id=r.event_id 
       WHERE r.id=$1 AND e.organizer_id=$2`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada ou sem permissão.' });

    await pool.query(
      'UPDATE registrations SET payment_status=\'pago\', payment_confirmed_at=NOW() WHERE id=$1',
      [req.params.id]
    );

    // Notificar atleta
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, \'payment\', $2, $3, $4)',
      [rows[0].athlete_id, 'Pagamento confirmado!', `Seu pagamento no evento "${rows[0].event_title}" foi confirmado!`, rows[0].event_id]
    );

    res.json({ message: 'Pagamento confirmado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao confirmar pagamento.' });
  }
});

// GET /api/registrations/my — minhas inscrições (atleta)
router.get('/my', authMiddleware, requireRole('atleta'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, e.title, e.event_date, e.modality, e.registration_fee, e.status as event_status,
        a.name as arena_name, a.city as arena_city
      FROM registrations r
      JOIN events e ON e.id = r.event_id
      JOIN arenas a ON a.id = e.arena_id
      WHERE r.athlete_id = $1
      ORDER BY e.event_date ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
});

module.exports = router;
