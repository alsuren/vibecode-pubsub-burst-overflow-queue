# Async Tier

This folder contains a Google Pub/Sub pull consumer and local testing tools.

# Google Pub/Sub Pull Consumer

This is a Node.js script that connects to Google Cloud Pub/Sub and pulls messages from a subscription.

## Prerequisites
- Node.js installed
- Docker installed (for local emulator)
- Google Cloud SDK and project (for real GCP)

## Local Testing with Emulator
1. Install dependencies:
   npm install
2. Start the Pub/Sub emulator (Docker recommended):
   node start-emulator-docker.js
   # or (if you want to try the Node emulator):
   node start-emulator.js
3. In a new terminal, set the environment variable:
   export PUBSUB_EMULATOR_HOST=localhost:8085
4. (First time only) Create a test subscription:
   node -e "const {{PubSub}} = require('@google-cloud/pubsub'); const pubsub = new PubSub({ projectId: 'test-project' }); pubsub.createTopic('test-topic').then(() => pubsub.topic('test-topic').createSubscription('test-sub')).then(() => console.log('Created test-topic and test-sub')).catch(()=>{});"
5. Publish a test message:
   node publish-test.js
6. Run the consumer:
   node pubsub-pull-consumer.js

## Usage (Real GCP)
1. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account key JSON file.
2. Set `PUBSUB_PROJECT_ID` and `PUBSUB_SUBSCRIPTION` env vars as needed.
3. Run the script:
   node pubsub-pull-consumer.js

---

- `publish-test.js` publishes a test message to the emulator.
- `pubsub-pull-consumer.js` will auto-detect the emulator if `PUBSUB_EMULATOR_HOST` is set.
- `start-emulator-docker.js` is the most reliable way to run the emulator locally.