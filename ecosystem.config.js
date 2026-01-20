module.exports = {
  apps: [
    {
      name: 'enqoy-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Wait for graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    // Note: Frontend is typically served by Nginx, not PM2
    // If you need to serve frontend with PM2 (not recommended for production):
    // {
    //   name: 'enqoy-frontend',
    //   cwd: './',
    //   script: 'npx',
    //   args: 'serve -s dist -l 8080',
    //   instances: 1,
    //   exec_mode: 'fork',
    //   env: {
    //     NODE_ENV: 'production',
    //   },
    //   error_file: './logs/frontend-error.log',
    //   out_file: './logs/frontend-out.log',
    //   autorestart: true,
    //   watch: false,
    // },
  ],
};


