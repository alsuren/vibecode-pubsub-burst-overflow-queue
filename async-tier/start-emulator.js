// This script starts the Google Pub/Sub emulator using gcloud CLI for local testing.
// Usage: node start-emulator.js

const { spawn } = require('child_process');

console.log('Starting Pub/Sub emulator...');
const emulator = spawn('gcloud', ['beta', 'emulators', 'pubsub', 'start', '--host-port=localhost:8085'], {
  stdio: 'inherit'
});

emulator.on('error', (err) => {
  console.error('Failed to start emulator:', err.message);
  console.log('Make sure gcloud CLI is installed and configured.');
});

process.on('SIGINT', () => {
  console.log('\nStopping emulator...');
  emulator.kill();
  process.exit(0);
});
