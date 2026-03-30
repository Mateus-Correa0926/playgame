// PM2 Ecosystem Config — PlayGAME (se usar PM2 fora do Docker)
// Uso: pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name: 'playgame',
    script: './backend/server.js',
    cwd: '/opt/playgame',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
