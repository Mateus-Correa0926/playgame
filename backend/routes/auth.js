// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { registerRules, loginRules } = require('../middleware/validate');
const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  path: '/'
};

// POST /api/auth/register
router.post('/register', registerRules, async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  try {
    const { rows: exists } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows: [{ id: userId }] } = await pool.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, hash, phone || null, role]
    );

    const token = jwt.sign(
      { id: userId, name, email, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('pg_token', token, COOKIE_OPTS);
    auditLog('auth.register', userId, { email, role }, req);
    res.status(201).json({ message: 'Cadastro realizado com sucesso!', user: { id: userId, name, email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      auditLog('auth.login_failed', null, { email, reason: 'not_found' }, req);
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      auditLog('auth.login_failed', user.id, { email, reason: 'wrong_password' }, req);
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('pg_token', token, COOKIE_OPTS);
    auditLog('auth.login', user.id, { email }, req);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// GET /api/auth/me — restaurar sessão via cookie
router.get('/me', (req, res) => {
  const token = req.cookies?.pg_token;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    pool.query('SELECT id, name, email, role, avatar, phone FROM users WHERE id = $1', [decoded.id])
      .then(({ rows }) => {
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado.' });
        const u = rows[0];
        res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar } });
      })
      .catch(() => res.status(500).json({ error: 'Erro interno.' }));
  } catch {
    res.clearCookie('pg_token', { path: '/' });
    return res.status(401).json({ error: 'Token inválido.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('pg_token', { path: '/' });
  res.json({ message: 'Logout realizado.' });
});

module.exports = router;
