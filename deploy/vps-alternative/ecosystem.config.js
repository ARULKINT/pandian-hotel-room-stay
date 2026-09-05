// PM2 process config for the backend.
// Usage (from the deploy runbook): pm2 start deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'pandian-hotel-api',
      cwd: '/var/www/pandian-hotel/backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork', // keep 1 instance: the booking-session/lockout state lives in memory
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '300M',
      autorestart: true,
      // backend/.env is loaded by server.js itself (process.loadEnvFile),
      // so PM2 doesn't need to inject ADMIN_PASSWORD/PORT/CORS_ORIGIN here.
    },
  ],
};
