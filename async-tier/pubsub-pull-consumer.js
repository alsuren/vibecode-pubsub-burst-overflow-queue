// Google Pub/Sub Pull Consumer
// Install dependencies: npm install @google-cloud/pubsub

const {PubSub} = require('@google-cloud/pubsub');


// Use environment variables for config, fallback to defaults for emulator
const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'test-sub';

// If PUBSUB_EMULATOR_HOST is set, PubSub will connect to the emulator automatically
if (process.env.PUBSUB_EMULATOR_HOST) {
  console.log('Using Pub/Sub emulator at', process.env.PUBSUB_EMULATOR_HOST);
}


async function listenForMessages() {
  const pubSubClient = new PubSub({projectId});
  const subscription = pubSubClient.subscription(subscriptionName);

  const pullLimit = parseInt(process.env.PULL_LIMIT, 10) || 1;
  let received = 0;

  const messageHandler = message => {
    received++;
    console.log(`Received message: ${message.id}:`);
    console.log(`Data: ${message.data}`);
    message.ack();
    if (received >= pullLimit) {
      // Allow time for ack to propagate
      setTimeout(() => process.exit(0), 100);
    }
  };

  subscription.on('message', messageHandler);
  console.log(`Listening for messages on subscription: ${subscriptionName} (will exit after ${pullLimit} message(s))`);
}

listenForMessages().catch(console.error);
