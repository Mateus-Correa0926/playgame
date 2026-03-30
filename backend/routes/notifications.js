// backend/routes/notifications.js
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const { rows: unread } = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE user_id=$1 AND is_read=false',
      [req.user.id]
    );
    res.json({ notifications: rows, unread_count: unread[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Notificações marcadas como lidas.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar notificações.' });
  }
});

module.exports = router;
