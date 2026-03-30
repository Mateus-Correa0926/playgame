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
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,name,email,phone,role,avatar,bio,created_at FROM users WHERE id=$1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
  const { name, phone, bio } = req.body;
  try {
    await pool.query('UPDATE users SET name=$1, phone=$2, bio=$3 WHERE id=$4', [name, phone, bio, req.user.id]);
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

module.exports = router;
