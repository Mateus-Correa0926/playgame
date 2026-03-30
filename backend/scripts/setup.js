#!/usr/bin/env node
// backend/scripts/setup.js
// Script de configuração inicial do PlayGAME (PostgreSQL)

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', bold: '\x1b[1m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

async function setup() {
  log('\n🏖  PlayGAME — Setup Inicial\n', 'bold');

  // 1. Criar pasta uploads
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    log('✅ Pasta /uploads criada', 'green');
  } else {
    log('ℹ️  Pasta /uploads já existe', 'blue');
  }

  // 2. Conectar ao banco
  log('\n📡 Conectando ao banco de dados...', 'yellow');
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();
    log('✅ Conexão estabelecida!', 'green');
  } catch (err) {
    log(`❌ Erro ao conectar: ${err.message}`, 'red');
    process.exit(1);
  }

  // 3. Executar schema
  log('\n🗄  Criando tabelas...', 'yellow');
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    log('✅ Tabelas criadas com sucesso!', 'green');
  } catch (err) {
    if (err.code === '42P07') {
      log('ℹ️  Tabelas já existem — pulando criação', 'blue');
    } else {
      log(`⚠️  Aviso no schema: ${err.message}`, 'yellow');
    }
  }

  // 4. Verificar se já há dados
  let userCount = 0;
  try {
    const res = await client.query('SELECT COUNT(*)::int as total FROM users');
    userCount = res.rows[0].total;
  } catch (e) {
    userCount = 0;
  }

  if (userCount === 0) {
    log('\n🌱 Inserindo dados de exemplo...', 'yellow');
    try {
      const seedPath = path.join(__dirname, '../../database/seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');
      await client.query(seed);
      log('✅ Dados de exemplo inseridos!', 'green');
    } catch (err) {
      log(`⚠️  Aviso no seed: ${err.message}`, 'yellow');
    }
  } else {
    log(`ℹ️  Banco já possui dados (${userCount} usuários) — seed ignorado`, 'blue');
  }

  await client.end();

  log('\n✅ Setup concluído com sucesso!\n', 'green');
  log('Para iniciar o servidor:', 'bold');
  log('  npm start\n', 'blue');
  log('Acesse: http://localhost:3001\n', 'blue');
}

setup().catch(err => {
  console.error('Erro no setup:', err);
  process.exit(1);
});
