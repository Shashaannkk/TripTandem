import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[1m\x1b[33m%s\x1b[0m', '  🚀 Starting TripTandem (Backend Server + Frontend Client)  ');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

// Prefix helper
function createPrefixedLogger(prefix, colorCode) {
  return (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line}`);
      }
    });
  };
}

// 1. Spawn Backend Server
const serverProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  shell: isWindows,
  env: { ...process.env, FORCE_COLOR: '1' },
});

serverProc.stdout.on('data', createPrefixedLogger('SERVER', '36')); // Cyan
serverProc.stderr.on('data', createPrefixedLogger('SERVER_ERR', '31')); // Red

// 2. Spawn Frontend Client
const clientProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  shell: isWindows,
  env: { ...process.env, FORCE_COLOR: '1' },
});

clientProc.stdout.on('data', createPrefixedLogger('CLIENT', '32')); // Green
clientProc.stderr.on('data', createPrefixedLogger('CLIENT_ERR', '33')); // Yellow

// Graceful cleanup
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down TripTandem services...');
  try {
    if (isWindows) {
      if (serverProc.pid) spawn('taskkill', ['/pid', serverProc.pid.toString(), '/f', '/t']);
      if (clientProc.pid) spawn('taskkill', ['/pid', clientProc.pid.toString(), '/f', '/t']);
    } else {
      serverProc.kill('SIGTERM');
      clientProc.kill('SIGTERM');
    }
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
