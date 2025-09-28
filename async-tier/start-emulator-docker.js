// This script starts the Google Pub/Sub emulator using Docker for maximum reliability.
// Usage: node start-emulator-docker.js

const { execSync } = require('child_process');

const DOCKER_IMAGE = 'gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators';
const CONTAINER_NAME = 'pubsub-emulator';
const PORT = 8085;

try {
  execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
} catch {}

console.log('Starting Pub/Sub emulator in Docker...');
execSync(
  `docker run --name ${CONTAINER_NAME} -d -p ${PORT}:8085 ${DOCKER_IMAGE} gcloud beta emulators pubsub start --host-port=0.0.0.0:8085`,
  { stdio: 'inherit' }
);
console.log(`Pub/Sub emulator running at localhost:${PORT}`);
console.log('Set PUBSUB_EMULATOR_HOST=localhost:8085 to use it.');
