// backend/routes/admin.js
// Rotas administrativas — visão geral, relatórios, gestão de usuários

const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/admin/overview — visão geral do sistema (apenas organizadores)
router.get('/overview', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows: [users] } = await pool.query('SELECT COUNT(*)::int as total, SUM(CASE WHEN role=\'atleta\' THEN 1 ELSE 0 END)::int as athletes, SUM(CASE WHEN role=\'organizador\' THEN 1 ELSE 0 END)::int as organizers FROM users');
    const { rows: [events] } = await pool.query('SELECT COUNT(*)::int as total, SUM(CASE WHEN status=\'confirmado\' THEN 1 ELSE 0 END)::int as confirmed, SUM(CASE WHEN status=\'pendente\' THEN 1 ELSE 0 END)::int as pending FROM events');
    const { rows: [regs] } = await pool.query('SELECT COUNT(*)::int as total, SUM(CASE WHEN payment_status=\'pago\' THEN 1 ELSE 0 END)::int as paid FROM registrations');
    const { rows: [arenas] } = await pool.query('SELECT COUNT(*)::int as total FROM arenas WHERE active=true');
    const { rows: recentEvents } = await pool.query(`
      SELECT e.id, e.title, e.event_date, e.modality, e.status,
        a.name as arena_name,
        COUNT(DISTINCT r.id)::int as total_reg,
        SUM(CASE WHEN r.payment_status='pago' THEN 1 ELSE 0 END)::int as paid_reg
      FROM events e
      LEFT JOIN arenas a ON a.id=e.arena_id
      LEFT JOIN registrations r ON r.event_id=e.id
      GROUP BY e.id, a.name
      ORDER BY e.created_at DESC LIMIT 5
    `);

    res.json({
      users: users[0] || users,
      events: events[0] || events,
      registrations: regs[0] || regs,
      arenas: arenas[0] || arenas,
      recent_events: recentEvents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar visão geral.' });
  }
});

// GET /api/admin/athletes — listar atletas
router.get('/athletes', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar, u.created_at,
        COUNT(DISTINCT r.id)::int as total_registrations,
        SUM(CASE WHEN r.payment_status='pago' THEN 1 ELSE 0 END)::int as paid_registrations
      FROM users u
      LEFT JOIN registrations r ON r.athlete_id = u.id
      WHERE u.role = 'atleta'
      GROUP BY u.id
      ORDER BY u.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atletas.' });
  }
});

// GET /api/admin/event/:id/report — relatório completo de um evento
router.get('/event/:id/report', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows: ev } = await pool.query(`
      SELECT e.*, a.name as arena_name, a.city as arena_city, a.address as arena_address,
        u.name as organizer_name, u.email as organizer_email
      FROM events e
      LEFT JOIN arenas a ON a.id=e.arena_id
      LEFT JOIN users u ON u.id=e.organizer_id
      WHERE e.id=$1
    `, [req.params.id]);
    if (ev.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });

    const { rows: registrations } = await pool.query(`
      SELECT r.*, u.name as athlete_name, u.email as athlete_email, u.phone as athlete_phone
      FROM registrations r JOIN users u ON u.id=r.athlete_id
      WHERE r.event_id=$1
      ORDER BY r.payment_status ASC, r.created_at ASC
    `, [req.params.id]);

    const { rows: comments } = await pool.query(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c JOIN users u ON u.id=c.user_id
      WHERE c.event_id=$1 ORDER BY c.created_at ASC
    `, [req.params.id]);

    const paid = registrations.filter(r => r.payment_status === 'pago');
    const pending = registrations.filter(r => r.payment_status === 'pendente');
    const revenue = paid.length * parseFloat(ev[0].registration_fee || 0);

    res.json({
      event: ev[0],
      summary: {
        total_registrations: registrations.length,
        paid: paid.length,
        pending: pending.length,
        revenue,
        spots_remaining: Math.max(0, ev[0].participant_limit - paid.length),
        fill_pct: ev[0].participant_limit > 0 ? Math.round(paid.length / ev[0].participant_limit * 100) : 0
      },
      paid_list: paid,
      pending_list: pending,
      comments
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório.' });
  }
});

module.exports = router;
