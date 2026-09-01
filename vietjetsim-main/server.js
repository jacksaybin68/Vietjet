#!/usr/bin/env node
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '127.0.0.1';
const port = parseInt(process.env.PORT, 10) || 3002;

// Workaround for Node.js v26.7.0 uv_interface_addresses bug
// Disable network interface detection
process.env.NEXT_TELEMETRY_DISABLED = '1';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`✓ VietjetSim ready on http://${hostname}:${port}`);
      console.log(`✓ Environment: ${dev ? 'development' : 'production'}`);
    })
    .on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
});
