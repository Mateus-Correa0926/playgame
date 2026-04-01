// backend/server.js — PlayGAME Main Server v1.3
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { testConnection } = require('./config/database');

const app = express();
const server = http.createServer(app);

// ── CORS — only allowed origins ──
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8091')
  .split(',').map(s => s.trim()).filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }
});

// ── SECURITY HEADERS (helmet + CSP) ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"],
      connectSrc: ["'self'", ...allowedOrigins, "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: null   // site served over HTTP; don't force HTTPS
    }
  },
  crossOriginEmbedderPolicy: false, // needed for external images
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false
}));

// ── RATE LIMITING ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 300,                    // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                     // 10 login/register attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // 1 min
  max: 30,                     // 30 buscas por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas buscas. Aguarde um momento.' }
});

app.set('io', io);
app.set('trust proxy', 1);
app.use(globalLimiter);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── CSRF PROTECTION — verificar Origin em requests de escrita ──
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origem não permitida.' });
  }
  next();
});

// ── UPLOADS — arquivos públicos (avatares/banners); comprovantes bloqueados (usar /api/payments/proof/:regId) ──
app.use('/uploads', (req, res, next) => {
  // Bloquear acesso direto a comprovantes — usar rota protegida com verificação de dono
  if (req.path.startsWith('/proof_')) {
    return res.status(403).json({ error: 'Acesse comprovantes via /api/payments/proof/:regId' });
  }
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use(express.static(path.join(__dirname, '../frontend')));

// ── ROTAS DA API ──
app.use('/api/auth',          authLimiter, require('./routes/auth'));
app.use('/api/events',        require('./routes/events-extended'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/users/search',  searchLimiter);
app.use('/api/users',         require('./routes/users'));
app.use('/api/invites',       require('./routes/invites'));
app.use('/api/arenas',        require('./routes/arenas'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/brackets',      require('./routes/brackets'));
app.use('/api/admin',         require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', app: 'PlayGAME', version: '1.3.0',
  uptime: Math.floor(process.uptime()) + 's'
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada.' });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── SOCKET.IO ──
const connectedUsers = new Map();

// Autenticação Socket.IO via cookie JWT
io.use((socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie || '';
    const match = rawCookie.match(/(?:^|;\s*)pg_token=([^;]*)/);
    const token = match && match[1];
    if (!token) return next(new Error('Token não fornecido. Use cookie httpOnly.'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = String(decoded.id);
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Token inválido.'));
  }
});

io.on('connection', (socket) => {
  connectedUsers.set(socket.userId, socket.id);
  socket.on('join_event', (id) => socket.join(`event_${id}`));
  socket.on('leave_event', (id) => socket.leave(`event_${id}`));
  socket.on('new_registration', (data) => {
    io.to(`event_${data.event_id}`).emit('registration_update', data);
    const s = connectedUsers.get(String(data.organizer_id));
    if (s) io.to(s).emit('notification', { type: 'registration', title: '📋 Nova inscrição!', message: `${data.athlete_name} se inscreveu` });
  });
  socket.on('new_comment', (data) => {
    io.to(`event_${data.event_id}`).emit('comment_update', data);
    if (String(data.organizer_id) !== socket.userId) {
      const s = connectedUsers.get(String(data.organizer_id));
      if (s) io.to(s).emit('notification', { type: 'comment', title: '💬 Novo comentário', message: data.user_name + ' comentou' });
    }
  });
  socket.on('payment_confirmed', (data) => {
    io.to(`event_${data.event_id}`).emit('payment_update', data);
    const s = connectedUsers.get(String(data.athlete_id));
    if (s) io.to(s).emit('notification', { type: 'payment', title: '✅ Pagamento confirmado!', message: 'Sua inscrição foi confirmada!' });
  });
  socket.on('match_result', (data) => io.to(`event_${data.event_id}`).emit('bracket_update', data));
  socket.on('disconnect', () => { if (socket.userId) connectedUsers.delete(socket.userId); });
});

module.exports = { io };

const PORT = process.env.PORT || 3001;
async function start() {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════╗`);
    console.log(`║  PlayGAME Server v1.3       ║`);
    console.log(`╚══════════════════════════════╝`);
    console.log(`📡 API:      http://localhost:${PORT}/api`);
    console.log(`🌐 App:      http://localhost:${PORT}\n`);
  });
}
start().catch(err => { console.error('❌', err.message); process.exit(1); });
