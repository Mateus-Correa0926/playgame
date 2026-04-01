// backend/routes/events-extended.js
// Rotas adicionais para eventos: banner upload, estatísticas, busca
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { searchQuery } = require('../middleware/validate');
const router = express.Router();

// Multer para banner — validação por MIME type
const IMAGE_MIMES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = IMAGE_MIMES[file.mimetype] || '.bin';
    cb(null, `banner_event_${req.params.id}_${Date.now()}${ext}`);
  }
});
const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIMES[file.mimetype]) {
      return cb(new Error('Tipo de arquivo inválido. Use JPG, PNG ou WebP.'));
    }
    cb(null, true);
  }
});

// Helper: remove arquivo antigo com segurança
function removeOldFile(filePath) {
  if (!filePath) return;
  const full = path.join(__dirname, '../../', filePath);
  const resolved = path.resolve(full);
  const uploadsDir = path.resolve(path.join(__dirname, '../../uploads'));
  if (!resolved.startsWith(uploadsDir)) return;
  fs.unlink(resolved, () => {});
}

// POST /api/events/:id/banner
router.post('/:id/banner', authMiddleware, requireRole('organizador'), uploadBanner.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  const bannerPath = `/uploads/${req.file.filename}`;
  try {
    const { rows } = await pool.query('SELECT banner FROM events WHERE id=$1 AND organizer_id=$2', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(403).json({ error: 'Sem permissão.' });
    const oldBanner = rows[0].banner;
    await pool.query('UPDATE events SET banner=$1 WHERE id=$2', [bannerPath, req.params.id]);
    removeOldFile(oldBanner);
    res.json({ message: 'Banner atualizado!', banner: bannerPath });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar banner.' });
  }
});

// GET /api/events/search?q=termo&modality=&city=
router.get('/search', searchQuery, async (req, res) => {
  const { q, modality, city, status } = req.query;
  try {
    let sql = `
      SELECT e.*, u.name as organizer_name,
        a.name as arena_name, a.city as arena_city,
        COUNT(DISTINCT r.id)::int as total_registered,
        SUM(CASE WHEN r.payment_status='pago' THEN 1 ELSE 0 END)::int as total_paid
      FROM events e
      LEFT JOIN users u ON u.id = e.organizer_id
      LEFT JOIN arenas a ON a.id = e.arena_id
      LEFT JOIN registrations r ON r.event_id = e.id
      WHERE 1=1`;
    const params = [];
    let paramIdx = 0;
    if (q) { sql += ` AND (e.title ILIKE $${++paramIdx} OR a.name ILIKE $${++paramIdx})`; params.push(`%${q}%`, `%${q}%`); }
    if (modality) { sql += ` AND e.modality = $${++paramIdx}`; params.push(modality); }
    if (city) { sql += ` AND a.city ILIKE $${++paramIdx}`; params.push(`%${city}%`); }
    if (status) { sql += ` AND e.status = $${++paramIdx}`; params.push(status); }
    sql += ' GROUP BY e.id, u.name, a.name, a.city ORDER BY e.event_date ASC';
    const { rows: events } = await pool.query(sql, params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

// GET /api/events/:id/stats — estatísticas do evento (organizador)
router.get('/:id/stats', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows: event } = await pool.query('SELECT * FROM events WHERE id=$1 AND organizer_id=$2', [req.params.id, req.user.id]);
    if (event.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });

    const { rows: stats } = await pool.query(`
      SELECT 
        COUNT(*)::int as total_registrations,
        SUM(CASE WHEN payment_status='pago' THEN 1 ELSE 0 END)::int as paid,
        SUM(CASE WHEN payment_status='pendente' THEN 1 ELSE 0 END)::int as pending,
        SUM(CASE WHEN payment_status='cancelado' THEN 1 ELSE 0 END)::int as cancelled
      FROM registrations WHERE event_id=$1`, [req.params.id]);

    const { rows: comments } = await pool.query('SELECT COUNT(*)::int as total FROM comments WHERE event_id=$1', [req.params.id]);
    const revenue = (stats[0].paid || 0) * parseFloat(event[0].registration_fee);

    res.json({
      event: event[0],
      registrations: stats[0],
      comments: comments[0].total,
      revenue,
      spots_remaining: Math.max(0, event[0].participant_limit - (stats[0].paid || 0)),
      fill_percentage: event[0].participant_limit > 0
        ? Math.round(((stats[0].paid || 0) / event[0].participant_limit) * 100)
        : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

// GET /api/events/organizer/mine — eventos do organizador logado
router.get('/organizer/mine', authMiddleware, requireRole('organizador'), async (req, res) => {
  try {
    const { rows: events } = await pool.query(`
      SELECT e.*, a.name as arena_name, a.city as arena_city,
        COUNT(DISTINCT r.id)::int as total_registered,
        SUM(CASE WHEN r.payment_status='pago' THEN 1 ELSE 0 END)::int as total_paid,
        (SELECT COUNT(*)::int FROM comments c WHERE c.event_id=e.id AND c.is_read=false) as unread_comments
      FROM events e
      LEFT JOIN arenas a ON a.id=e.arena_id
      LEFT JOIN registrations r ON r.event_id=e.id
      WHERE e.organizer_id=$1
      GROUP BY e.id, a.name, a.city
      ORDER BY e.event_date DESC`, [req.user.id]);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar seus eventos.' });
  }
});

// PUT /api/events/:id/mark-comments-read
router.put('/:id/mark-comments-read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE comments SET is_read=true WHERE event_id=$1', [req.params.id]);
    res.json({ message: 'Comentários marcados como lidos.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro.' });
  }
});

module.exports = router;
