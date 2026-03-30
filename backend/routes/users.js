// backend/routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const prefix = file.fieldname === 'banner' ? 'banner' : 'avatar';
    const ext = path.extname(file.originalname);
    cb(null, `${prefix}_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,email,phone,role,avatar,bio,cpf,birth_date,gender,city,state,shirt_size,banner,created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
  const { name, phone, bio, cpf, birth_date, gender, city, state, shirt_size } = req.body;
  try {
    await pool.query(
      `UPDATE users SET name=$1, phone=$2, bio=$3, cpf=$4, birth_date=$5, gender=$6, city=$7, state=$8, shirt_size=$9, updated_at=NOW() WHERE id=$10`,
      [name, phone, bio, cpf || null, birth_date || null, gender || null, city || null, state || null, shirt_size || null, req.user.id]
    );
    res.json({ message: 'Perfil atualizado!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// PUT /api/users/me/password
router.put('/me/password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const { rows } = await pool.query('SELECT password FROM users WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  const avatarPath = `/uploads/${req.file.filename}`;
  try {
    await pool.query('UPDATE users SET avatar=$1 WHERE id=$2', [avatarPath, req.user.id]);
    res.json({ message: 'Foto atualizada!', avatar: avatarPath });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar imagem.' });
  }
});

// POST /api/users/me/banner
router.post('/me/banner', authMiddleware, upload.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  const bannerPath = `/uploads/${req.file.filename}`;
  try {
    await pool.query('UPDATE users SET banner=$1 WHERE id=$2', [bannerPath, req.user.id]);
    res.json({ message: 'Banner atualizado!', banner: bannerPath });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar banner.' });
  }
});

// GET /api/users/search?q=term — search users for partner invite
router.get('/search', authMiddleware, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, avatar, city, state FROM users
       WHERE role='atleta' AND id != $1 AND (name ILIKE $2 OR email ILIKE $2)
       ORDER BY name LIMIT 20`,
      [req.user.id, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

// GET /api/users/profile-completeness — check if profile has all required fields
router.get('/profile-completeness', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, phone, cpf, birth_date, gender, city, state FROM users WHERE id=$1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const u = rows[0];
    const fields = ['name', 'phone', 'cpf', 'birth_date', 'gender', 'city', 'state'];
    const filled = fields.filter(f => u[f]);
    res.json({ complete: filled.length === fields.length, filled: filled.length, total: fields.length, missing: fields.filter(f => !u[f]) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar perfil.' });
  }
});

module.exports = router;
