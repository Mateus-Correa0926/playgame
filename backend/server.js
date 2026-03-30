// backend/server.js — PlayGAME Main Server v1.1
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { testConnection } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.set('io', io);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// ── ROTAS DA API ──
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/events',        require('./routes/events-extended'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/invites',       require('./routes/invites'));
app.use('/api/arenas',        require('./routes/arenas'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/brackets',      require('./routes/brackets'));
app.use('/api/admin',         require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', app: 'PlayGAME', version: '1.1.0',
  uptime: Math.floor(process.uptime()) + 's'
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada.' });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── SOCKET.IO ──
const connectedUsers = new Map();

io.on('connection', (socket) => {
  socket.on('authenticate', (userId) => {
    if (userId) { connectedUsers.set(String(userId), socket.id); socket.userId = String(userId); }
  });
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
    console.log(`║  🏖  PlayGAME Server v1.1   ║`);
    console.log(`╚══════════════════════════════╝`);
    console.log(`📡 API:      http://localhost:${PORT}/api`);
    console.log(`🌐 App:      http://localhost:${PORT}\n`);
  });
}
start().catch(err => { console.error('❌', err.message); process.exit(1); });
