module.exports = {
  apps: [{
    name: 'knovator-job-importer',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    // Restart on memory limit
    max_memory_restart: '500M',
    // Restart on file changes (optional)
    watch: false,
    // Ignore certain files
    ignore_watch: ['node_modules', 'logs'],
    // Restart delay
    restart_delay: 4000,
    // Kill timeout
    kill_timeout: 5000,
    // Graceful shutdown
    listen_timeout: 8000,
    // Error handling
    exp_backoff_restart_delay: 100,
    // Max restart attempts
    max_restarts: 10,
    // Min uptime before considering app stable
    min_uptime: '10s'
  }]
}; 