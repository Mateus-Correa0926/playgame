// backend/routes/invites.js — Partner invite system
const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

// POST /api/invites — send partner invite (by user id or email)
router.post('/', authMiddleware, requireRole('atleta'), async (req, res) => {
  const { event_id, registration_id, invitee_id, invitee_email } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id obrigatório.' });
  if (!invitee_id && !invitee_email) return res.status(400).json({ error: 'Informe o parceiro (id ou email).' });

  try {
    // Check if registration exists and belongs to user
    if (registration_id) {
      const { rows: reg } = await pool.query(
        'SELECT id FROM registrations WHERE id=$1 AND athlete_id=$2', [registration_id, req.user.id]
      );
      if (reg.length === 0) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    }

    // Check for existing pending invite
    const { rows: existing } = await pool.query(
      `SELECT id FROM partner_invites
       WHERE event_id=$1 AND inviter_id=$2 AND status='pendente'`,
      [event_id, req.user.id]
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM partner_invites WHERE id=$1', [existing[0].id]);
    }

    const invite_token = crypto.randomBytes(32).toString('hex');

    // If invitee_email provided, try to find user
    let resolvedInviteeId = invitee_id || null;
    let resolvedEmail = invitee_email || null;
    if (!resolvedInviteeId && resolvedEmail) {
      const { rows: found } = await pool.query('SELECT id FROM users WHERE email=$1', [resolvedEmail]);
      if (found.length > 0) resolvedInviteeId = found[0].id;
    }
    if (resolvedInviteeId && !resolvedEmail) {
      const { rows: found } = await pool.query('SELECT email FROM users WHERE id=$1', [resolvedInviteeId]);
      if (found.length > 0) resolvedEmail = found[0].email;
    }

    const { rows: [invite] } = await pool.query(
      `INSERT INTO partner_invites (event_id, registration_id, inviter_id, invitee_id, invitee_email, invite_token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, invite_token`,
      [event_id, registration_id || null, req.user.id, resolvedInviteeId, resolvedEmail, invite_token]
    );

    // Notify invitee if they're a registered user
    if (resolvedInviteeId) {
      const { rows: ev } = await pool.query('SELECT title FROM events WHERE id=$1', [event_id]);
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'registration', $2, $3, $4)`,
        [resolvedInviteeId, 'Convite de dupla!',
         `${req.user.name} te convidou para jogar em "${ev[0]?.title || 'evento'}".`,
         event_id]
      );
    }

    res.status(201).json({
      message: 'Convite enviado!',
      invite_id: invite.id,
      invite_link: `/convite/${invite.invite_token}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar convite.' });
  }
});

// GET /api/invites/my — invites I received
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pi.*, e.title as event_title, e.event_date, e.modality,
        u.name as inviter_name, u.avatar as inviter_avatar
      FROM partner_invites pi
      JOIN events e ON e.id = pi.event_id
      JOIN users u ON u.id = pi.inviter_id
      WHERE pi.invitee_id = $1 AND pi.status = 'pendente'
      ORDER BY pi.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar convites.' });
  }
});

// GET /api/invites/sent — invites I sent
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pi.*, e.title as event_title, e.event_date,
        COALESCE(u.name, pi.invitee_email) as invitee_name, u.avatar as invitee_avatar
      FROM partner_invites pi
      JOIN events e ON e.id = pi.event_id
      LEFT JOIN users u ON u.id = pi.invitee_id
      WHERE pi.inviter_id = $1
      ORDER BY pi.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar convites enviados.' });
  }
});

// PUT /api/invites/:id/accept — accept partner invite
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pi.*, e.title as event_title FROM partner_invites pi
       JOIN events e ON e.id = pi.event_id
       WHERE pi.id=$1 AND pi.invitee_id=$2 AND pi.status='pendente'`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Convite não encontrado.' });

    const invite = rows[0];

    // Update invite status
    await pool.query(
      "UPDATE partner_invites SET status='aceito', responded_at=NOW() WHERE id=$1",
      [invite.id]
    );

    // Update registration with partner info
    if (invite.registration_id) {
      const { rows: me } = await pool.query('SELECT name, email, phone FROM users WHERE id=$1', [req.user.id]);
      await pool.query(
        `UPDATE registrations SET partner_id=$1, partner_name=$2, partner_email=$3, partner_phone=$4 WHERE id=$5`,
        [req.user.id, me[0].name, me[0].email, me[0].phone, invite.registration_id]
      );
    }

    // Notify inviter
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id)
       VALUES ($1, 'registration', $2, $3, $4)`,
      [invite.inviter_id, 'Convite aceito!',
       `${req.user.name} aceitou ser sua dupla em "${invite.event_title}".`,
       invite.event_id]
    );

    res.json({ message: 'Convite aceito! Vocês são dupla agora.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aceitar convite.' });
  }
});

// PUT /api/invites/:id/decline — decline partner invite
router.put('/:id/decline', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM partner_invites WHERE id=$1 AND invitee_id=$2 AND status='pendente'",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Convite não encontrado.' });

    await pool.query(
      "UPDATE partner_invites SET status='recusado', responded_at=NOW() WHERE id=$1",
      [req.params.id]
    );

    res.json({ message: 'Convite recusado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao recusar convite.' });
  }
});

// GET /api/invites/token/:token — view invite by token (for link sharing)
router.get('/token/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pi.*, e.title as event_title, e.event_date, e.modality, e.registration_fee,
        u.name as inviter_name, u.avatar as inviter_avatar,
        a.name as arena_name, a.city as arena_city
      FROM partner_invites pi
      JOIN events e ON e.id = pi.event_id
      JOIN users u ON u.id = pi.inviter_id
      JOIN arenas a ON a.id = e.arena_id
      WHERE pi.invite_token = $1
    `, [req.params.token]);
    if (rows.length === 0) return res.status(404).json({ error: 'Convite não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar convite.' });
  }
});

// PUT /api/invites/token/:token/accept — accept invite via link
router.put('/token/:token/accept', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pi.*, e.title as event_title FROM partner_invites pi
       JOIN events e ON e.id = pi.event_id
       WHERE pi.invite_token=$1 AND pi.status='pendente'`,
      [req.params.token]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Convite não encontrado ou já respondido.' });

    const invite = rows[0];

    // Update invite
    await pool.query(
      "UPDATE partner_invites SET status='aceito', invitee_id=$1, responded_at=NOW() WHERE id=$2",
      [req.user.id, invite.id]
    );

    // Update registration
    if (invite.registration_id) {
      const { rows: me } = await pool.query('SELECT name, email, phone FROM users WHERE id=$1', [req.user.id]);
      await pool.query(
        `UPDATE registrations SET partner_id=$1, partner_name=$2, partner_email=$3, partner_phone=$4 WHERE id=$5`,
        [req.user.id, me[0].name, me[0].email, me[0].phone, invite.registration_id]
      );
    }

    // Notify inviter
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id)
       VALUES ($1, 'registration', $2, $3, $4)`,
      [invite.inviter_id, 'Convite aceito!',
       `${req.user.name} aceitou ser sua dupla em "${invite.event_title}".`,
       invite.event_id]
    );

    res.json({ message: 'Convite aceito!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aceitar convite.' });
  }
});

// PUT /api/invites/token/:token/decline — decline invite via link
router.put('/token/:token/decline', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM partner_invites WHERE invite_token=$1 AND status='pendente'",
      [req.params.token]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Convite não encontrado ou já respondido.' });

    await pool.query(
      "UPDATE partner_invites SET status='recusado', invitee_id=$1, responded_at=NOW() WHERE id=$2",
      [req.user.id, rows[0].id]
    );

    res.json({ message: 'Convite recusado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao recusar convite.' });
  }
});

module.exports = router;
