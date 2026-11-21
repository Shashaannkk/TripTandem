/**
 * scripts/verify_docker_prerequisites.js
 * Automated Docker Compose Multi-Service Verification & Preflight Check (OPS-02)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  🐳 TRIPTANDEM DOCKER COMPOSE AUTOMATION PREFLIGHT (OPS-02)          ');
console.log('════════════════════════════════════════════════════════════════════════\n');

// 1. Verify Configuration Artifacts
const composePath = path.resolve('docker-compose.yml');
const dockerfilePath = path.resolve('server/Dockerfile');
const workflowPath = path.resolve('.github/workflows/docker-compose-test.yml');

let allFilesPresent = true;
[
  { name: 'docker-compose.yml', path: composePath },
  { name: 'server/Dockerfile', path: dockerfilePath },
  { name: '.github/workflows/docker-compose-test.yml', path: workflowPath },
].forEach(f => {
  if (fs.existsSync(f.path)) {
    console.log(`  ✅ [PASS] Found configuration file: ${f.name}`);
  } else {
    console.error(`  ❌ [FAIL] Missing file: ${f.name}`);
    allFilesPresent = false;
  }
});

// 2. Validate docker-compose.yml structure
try {
  const composeContent = fs.readFileSync(composePath, 'utf8');
  const hasMongo = composeContent.includes('mongodb:');
  const hasServer = composeContent.includes('server:');
  const hasHealthcheck = composeContent.includes('healthcheck:');
  const hasIsolatedNet = composeContent.includes('triptandem-net:');

  if (hasMongo && hasServer && hasHealthcheck && hasIsolatedNet) {
    console.log('  ✅ [PASS] docker-compose.yml schema validates (MongoDB, Express API, Healthchecks, Isolated Bridge Network)');
  } else {
    console.error('  ❌ [FAIL] docker-compose.yml is missing required service definitions.');
  }
} catch (e) {
  console.error('  ❌ [FAIL] Could not parse docker-compose.yml:', e.message);
}

// 3. Inspect Docker Daemon Availability
console.log('\n--- Checking Docker Host Engine Status ---');
let dockerAvailable = false;
let dockerDaemonRunning = false;

try {
  const version = execSync('docker --version', { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
  console.log(`  ✅ Docker CLI detected: ${version}`);
  dockerAvailable = true;

  try {
    execSync('docker info', { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
    console.log('  ✅ Docker Engine daemon is active and responsive.');
    dockerDaemonRunning = true;
  } catch {
    console.log('  ⚠️ Docker CLI is installed, but Docker Desktop / daemon is currently not running.');
  }
} catch {
  console.log('  ℹ️ Docker CLI is not installed on this host system.');
}

console.log('\n========================================================================');
if (dockerDaemonRunning) {
  console.log('  🚀 DOCKER READY: You can run the automated verification stack now:');
  console.log('     npm run test:docker:run');
} else {
  console.log('  📋 OPERATOR INSTRUCTIONS TO VERIFY OPS-02 (DOCKER COMPOSE):');
  console.log('  -------------------------------------------------------------');
  console.log('  1. Start Docker Desktop (or run on any Docker-enabled runner/CI).');
  console.log('  2. Run the isolated verification command:');
  console.log('\n  [Windows PowerShell]:');
  console.log('  $sec = [System.Convert]::ToHexString((1..32 | % { Get-Random -Max 256 })); docker compose -p tt-test up -d --build');
  console.log('\n  [Linux / macOS Bash]:');
  console.log('  JWT_SECRET=$(node -e "process.stdout.write(require(\'crypto\').randomBytes(32).toString(\'hex\'))") docker compose -p tt-test up -d --build');
  console.log('\n  3. Test persistence across container restart:');
  console.log('  docker compose -p tt-test restart server');
  console.log('  curl http://localhost:3001/api/health');
  console.log('  docker compose -p tt-test down -v');
}
console.log('========================================================================\n');

process.exit(allFilesPresent ? 0 : 1);
