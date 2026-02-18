const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

// Auto-detect local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Inject local IP into .env.local so Next.js inlines it in client code
const localIP = getLocalIP();
const envLocalPath = path.join(__dirname, '.env.local');
let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf-8') : '';
if (envContent.includes('NEXT_PUBLIC_LOCAL_IP=')) {
  envContent = envContent.replace(/NEXT_PUBLIC_LOCAL_IP=.*/g, `NEXT_PUBLIC_LOCAL_IP=${localIP}`);
} else {
  envContent = envContent.trimEnd() + `\n\n# Auto-detected local IP (written by server.js)\nNEXT_PUBLIC_LOCAL_IP=${localIP}\n`;
}
fs.writeFileSync(envLocalPath, envContent);
process.env.NEXT_PUBLIC_LOCAL_IP = localIP;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const certPath = path.join(__dirname, 'certificates');

// Check if certificates exist, generate if missing
if (!fs.existsSync(path.join(certPath, 'key.pem')) || !fs.existsSync(path.join(certPath, 'cert.pem'))) {
  console.error('Certificates not found in ./certificates/');
  console.error('Generate them with:');
  console.error('  mkdir -p certificates');
  console.error('  openssl req -x509 -newkey rsa:2048 -keyout certificates/key.pem -out certificates/cert.pem -days 365 -nodes -subj "/CN=localhost"');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(path.join(certPath, 'key.pem')),
  cert: fs.readFileSync(path.join(certPath, 'cert.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log('');
      console.log('  ▲ Pétanque App (HTTPS)');
      console.log(`  - Local:   https://localhost:${port}`);
      console.log(`  - Phone:   https://${localIP}:${port}`);
      console.log('');
    });
});
