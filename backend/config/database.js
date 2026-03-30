// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  max: 10,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Banco de dados conectado com sucesso!');
    client.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
