module.exports = {
  apps: [{
    name: 'ead',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/ead',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/ead-error.log',
    out_file: '/var/log/pm2/ead-out.log',
    log_file: '/var/log/pm2/ead-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}