// backend/routes/arenas.js
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/arenas
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM arenas WHERE active=true ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar arenas.' });
  }
});

// GET /api/arenas/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM arenas WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Arena não encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar arena.' });
  }
});

// POST /api/arenas — apenas organizador
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'organizador') return res.status(403).json({ error: 'Apenas organizadores.' });
  const { name, address, city, state, phone, email, description } = req.body;
  if (!name || !address || !city || !state) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });

  try {
    const { rows: [{ id }] } = await pool.query(
      'INSERT INTO arenas (name, address, city, state, phone, email, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [name, address, city, state, phone || null, email || null, description || null]
    );
    res.status(201).json({ message: 'Arena cadastrada!', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar arena.' });
  }
});

module.exports = router;
