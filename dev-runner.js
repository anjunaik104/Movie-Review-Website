import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting CineVerse Full-Stack Environment...\n');

// Check if backend is already listening on port 5000
function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/stats', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  const isAlreadyRunning = await checkServerRunning();
  let serverProcess = null;

  if (isAlreadyRunning) {
    console.log('⚡ CineVerse API Server is already active on http://localhost:5000');
  } else {
    serverProcess = spawn('node', ['server/server.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });
  }

  // Start Vite Client Dev Server
  const clientProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, 'client')
  });

  const cleanup = () => {
    console.log('\n🛑 Shutting down CineVerse dev processes...');
    if (serverProcess) serverProcess.kill();
    clientProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start();
