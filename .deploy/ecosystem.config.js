module.exports = {
  apps: [
    {
      name: 'vietjet',
      cwd: '/var/www/vietjet/vietjetsim-main',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4028',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '4028',
      },
    },
  ],
};
