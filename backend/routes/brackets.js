// backend/routes/brackets.js
// Sistema de chaveamento/confrontos para eventos

const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/brackets/:eventId — buscar chaveamento
router.get('/:eventId', async (req, res) => {
  try {
    const { rows: matches } = await pool.query(`
      SELECT b.*,
        u1.name as team1_name, r1.team_name as team1_squad, r1.partner_name as team1_partner,
        u2.name as team2_name, r2.team_name as team2_squad, r2.partner_name as team2_partner,
        uw.name as winner_name
      FROM brackets b
      LEFT JOIN registrations r1 ON r1.id = b.team1_reg_id
      LEFT JOIN users u1 ON u1.id = r1.athlete_id
      LEFT JOIN registrations r2 ON r2.id = b.team2_reg_id
      LEFT JOIN users u2 ON u2.id = r2.athlete_id
      LEFT JOIN registrations rw ON rw.id = b.winner_reg_id
      LEFT JOIN users uw ON uw.id = rw.athlete_id
      WHERE b.event_id = $1
      ORDER BY b.round ASC, b.match_number ASC
    `, [req.params.eventId]);

    const rounds = {};
    matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });

    res.json({ matches, rounds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar chaveamento.' });
  }
});

// POST /api/brackets/:eventId/generate — gerar chaveamento automático
router.post('/:eventId/generate', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    // Checar permissão
    const { rows: ev } = await pool.query('SELECT * FROM events WHERE id=$1 AND organizer_id=$2', [req.params.eventId, req.user.id]);
    if (ev.length === 0) return res.status(403).json({ error: 'Sem permissão.' });

    // Buscar inscritos pagos
    const { rows: paid } = await pool.query(
      'SELECT * FROM registrations WHERE event_id=$1 AND payment_status=\'pago\' ORDER BY RANDOM()',
      [req.params.eventId]
    );

    if (paid.length < 2) return res.status(400).json({ error: 'Mínimo de 2 equipes pagas para gerar chaveamento.' });

    // Limpar chaveamento existente
    await pool.query('DELETE FROM brackets WHERE event_id=$1', [req.params.eventId]);

    // Gerar rodada 1 com shuffle
    const teams = [...paid];
    // Completar para potência de 2 (byes)
    let size = 2;
    while (size < teams.length) size *= 2;

    const values = [];
    const placeholders = [];
    let matchNum = 1;
    let paramIdx = 0;
    for (let i = 0; i < size; i += 2) {
      const t1 = teams[i] || null;
      const t2 = teams[i + 1] || null;
      placeholders.push(`($${++paramIdx}, $${++paramIdx}, $${++paramIdx}, $${++paramIdx}, $${++paramIdx})`);
      values.push(req.params.eventId, 1, matchNum++, t1?.id || null, t2?.id || null);
    }

    await pool.query(
      `INSERT INTO brackets (event_id, round, match_number, team1_reg_id, team2_reg_id) VALUES ${placeholders.join(', ')}`,
      values
    );

    res.json({ message: `Chaveamento gerado com ${placeholders.length} confronto(s) na rodada 1!`, matches: placeholders.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar chaveamento.' });
  }
});

// PUT /api/brackets/match/:matchId — atualizar resultado de uma partida
router.put('/match/:matchId', authMiddleware, requireRole('organizador'), async (req, res) => {
  const { team1_score, team2_score, winner_reg_id, status, scheduled_time, court } = req.body;
  try {
    // Verificar se o organizador é dono do evento da partida
    const { rows: ownership } = await pool.query(
      `SELECT b.id FROM brackets b JOIN events e ON e.id = b.event_id WHERE b.id = $1 AND e.organizer_id = $2`,
      [req.params.matchId, req.user.id]
    );
    if (ownership.length === 0) return res.status(403).json({ error: 'Sem permissão para editar esta partida.' });

    await pool.query(
      `UPDATE brackets SET team1_score=$1, team2_score=$2, winner_reg_id=$3, status=$4, scheduled_time=$5, court=$6 WHERE id=$7`,
      [team1_score, team2_score, winner_reg_id || null, status || 'finalizado', scheduled_time || null, court || null, req.params.matchId]
    );

    // Se todos os jogos da rodada finalizados, criar próxima rodada automaticamente
    const { rows: match } = await pool.query('SELECT * FROM brackets WHERE id=$1', [req.params.matchId]);
    if (match.length > 0 && status === 'finalizado') {
      const { event_id, round } = match[0];
      const { rows: roundMatches } = await pool.query(
        'SELECT * FROM brackets WHERE event_id=$1 AND round=$2', [event_id, round]
      );
      const allDone = roundMatches.every(m => m.status === 'finalizado' || m.id === parseInt(req.params.matchId));
      const winners = roundMatches.map(m => m.id === parseInt(req.params.matchId) ? winner_reg_id : m.winner_reg_id).filter(Boolean);

      if (allDone && winners.length >= 2) {
        // Gerar próxima rodada
        const { rows: maxMatch } = await pool.query('SELECT MAX(match_number) as mx FROM brackets WHERE event_id=$1 AND round=$2', [event_id, round + 1]);
        let nextMatch = (maxMatch[0].mx || 0) + 1;
        const nextValues = [];
        const nextPlaceholders = [];
        let nextParamIdx = 0;
        for (let i = 0; i < winners.length; i += 2) {
          if (winners[i + 1]) {
            nextPlaceholders.push(`($${++nextParamIdx}, $${++nextParamIdx}, $${++nextParamIdx}, $${++nextParamIdx}, $${++nextParamIdx})`);
            nextValues.push(event_id, round + 1, nextMatch++, winners[i], winners[i + 1]);
          }
        }
        if (nextPlaceholders.length > 0) {
          await pool.query(
            `INSERT INTO brackets (event_id, round, match_number, team1_reg_id, team2_reg_id) VALUES ${nextPlaceholders.join(', ')} ON CONFLICT DO NOTHING`,
            nextValues
          );
        }
      }
    }

    res.json({ message: 'Resultado atualizado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar resultado.' });
  }
});

module.exports = router;
