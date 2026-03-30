// backend/routes/events.js
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

const MODALITY_LABELS = {
  volei_dupla_masculino: 'Vôlei de Dupla Masculino',
  volei_dupla_feminino: 'Vôlei de Dupla Feminino',
  volei_dupla_misto: 'Vôlei de Dupla Misto',
  volei_4x4_masculino: 'Vôlei 4x4 Masculino',
  volei_4x4_feminino: 'Vôlei 4x4 Feminino',
  volei_4x4_misto: 'Vôlei 4x4 Misto',
  futevolei_masculino: 'Futevôlei Masculino',
  futevolei_feminino: 'Futevôlei Feminino',
  futevolei_misto: 'Futevôlei Misto',
  beach_tennis_1x1_masculino: 'Beach Tennis 1x1 Masculino',
  beach_tennis_1x1_feminino: 'Beach Tennis 1x1 Feminino',
  beach_tennis_2x2_masculino: 'Beach Tennis 2x2 Masculino',
  beach_tennis_2x2_feminino: 'Beach Tennis 2x2 Feminino',
  beach_tennis_2x2_misto: 'Beach Tennis 2x2 Misto'
};

// GET /api/events — listar todos os eventos
router.get('/', async (req, res) => {
  try {
    const { rows: events } = await pool.query(`
      SELECT e.*, 
        u.name as organizer_name,
        a.name as arena_name, a.city as arena_city, a.address as arena_address,
        COUNT(DISTINCT r.id)::int as total_registered,
        SUM(CASE WHEN r.payment_status='pago' THEN 1 ELSE 0 END)::int as total_paid
      FROM events e
      LEFT JOIN users u ON u.id = e.organizer_id
      LEFT JOIN arenas a ON a.id = e.arena_id
      LEFT JOIN registrations r ON r.event_id = e.id
      GROUP BY e.id, u.name, a.name, a.city, a.address
      ORDER BY e.event_date ASC
    `);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar eventos.' });
  }
});

// GET /api/events/:id — detalhe do evento
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, 
        u.name as organizer_name, u.phone as organizer_phone,
        a.name as arena_name, a.city as arena_city, a.state as arena_state,
        a.address as arena_address, a.phone as arena_phone
      FROM events e
      LEFT JOIN users u ON u.id = e.organizer_id
      LEFT JOIN arenas a ON a.id = e.arena_id
      WHERE e.id = $1
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });

    const event = rows[0];
    event.modality_label = MODALITY_LABELS[event.modality] || event.modality;

    // Inscritos sem pagamento
    const { rows: pending } = await pool.query(`
      SELECT r.id, r.partner_name, r.team_name, r.created_at,
        u.name as athlete_name, u.avatar as athlete_avatar
      FROM registrations r
      JOIN users u ON u.id = r.athlete_id
      WHERE r.event_id = $1 AND r.payment_status = 'pendente'
      ORDER BY r.created_at ASC
    `, [req.params.id]);

    // Inscritos com pagamento confirmado
    const { rows: paid } = await pool.query(`
      SELECT r.id, r.partner_name, r.team_name, r.payment_confirmed_at,
        u.name as athlete_name, u.avatar as athlete_avatar
      FROM registrations r
      JOIN users u ON u.id = r.athlete_id
      WHERE r.event_id = $1 AND r.payment_status = 'pago'
      ORDER BY r.payment_confirmed_at ASC
    `, [req.params.id]);

    // Comentários
    const { rows: comments } = await pool.query(`
      SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.event_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);

    res.json({ ...event, pending_registrations: pending, paid_registrations: paid, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar evento.' });
  }
});

// POST /api/events — criar evento (organizador)
router.post('/', authMiddleware, requireRole('organizador'), async (req, res) => {
  const { arena_id, title, modality, event_date, start_time, end_time, registration_fee, participant_limit, rules, description } = req.body;
  if (!arena_id || !title || !modality || !event_date || !start_time) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  try {
    const { rows: [{ id }] } = await pool.query(
      `INSERT INTO events (organizer_id, arena_id, title, modality, event_date, start_time, end_time, registration_fee, participant_limit, rules, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [req.user.id, arena_id, title, modality, event_date, start_time, end_time || null, registration_fee || 0, participant_limit || 16, rules || '', description || '']
    );
    res.status(201).json({ message: 'Evento criado com sucesso!', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar evento.' });
  }
});

// PUT /api/events/:id — editar evento (organizador dono)
router.put('/:id', authMiddleware, requireRole('organizador'), async (req, res) => {
  const { title, modality, event_date, start_time, end_time, registration_fee, participant_limit, rules, description, status } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM events WHERE id = $1 AND organizer_id = $2', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });

    await pool.query(
      `UPDATE events SET title=$1, modality=$2, event_date=$3, start_time=$4, end_time=$5, registration_fee=$6, participant_limit=$7, rules=$8, description=$9, status=$10 WHERE id=$11`,
      [title, modality, event_date, start_time, end_time || null, registration_fee, participant_limit, rules, description, status || rows[0].status, req.params.id]
    );
    res.json({ message: 'Evento atualizado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar evento.' });
  }
});

// DELETE /api/events/:id — excluir evento (organizador dono)
router.delete('/:id', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM events WHERE id = $1 AND organizer_id = $2', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });

    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Evento excluído com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir evento.' });
  }
});

// PUT /api/events/:id/confirm-arena — arena confirma evento
router.put('/:id/confirm-arena', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE events SET arena_confirmed=true, arena_confirmed_at=NOW(), status=\'confirmado\' WHERE id=$1',
      [req.params.id]
    );

    // Notificar organizador
    const { rows: event } = await pool.query('SELECT organizer_id, title FROM events WHERE id=$1', [req.params.id]);
    if (event.length > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, \'arena_confirm\', $2, $3, $4)',
        [event[0].organizer_id, 'Arena confirmou seu evento!', `A arena confirmou o evento "${event[0].title}".`, req.params.id]
      );
    }

    res.json({ message: 'Evento confirmado pela arena!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao confirmar evento.' });
  }
});

// POST /api/events/:id/comment — comentar no evento
router.post('/:id/comment', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem obrigatória.' });

  try {
    const { rows: [{ id }] } = await pool.query(
      'INSERT INTO comments (event_id, user_id, message) VALUES ($1, $2, $3) RETURNING id',
      [req.params.id, req.user.id, message]
    );

    // Notificar organizador
    const { rows: event } = await pool.query('SELECT organizer_id, title FROM events WHERE id=$1', [req.params.id]);
    if (event.length > 0 && event[0].organizer_id !== req.user.id) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, event_id) VALUES ($1, \'comment\', $2, $3, $4)',
        [event[0].organizer_id, 'Novo comentário no evento', `${req.user.name} comentou em "${event[0].title}".`, req.params.id]
      );
    }

    res.status(201).json({ message: 'Comentário enviado!', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar comentário.' });
  }
});

module.exports = router;
