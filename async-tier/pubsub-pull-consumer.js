// Google Pub/Sub Pull Consumer using true synchronous Pull gRPC method
// Uses custom SyncPubSubClient wrapper to access low-level pull() correctly

const { SyncPubSubClient } = require('./sync-pubsub-client');

const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'test-sub';

if (process.env.PUBSUB_EMULATOR_HOST) {
  console.log('Using Pub/Sub emulator at', process.env.PUBSUB_EMULATOR_HOST);
}

async function pollForMessages() {
  const client = new SyncPubSubClient({ projectId });
  
  const pullLimit = process.env.PULL_LIMIT ? parseInt(process.env.PULL_LIMIT, 10) : Infinity;
  const maxMessages = parseInt(process.env.MAX_MESSAGES_PER_POLL, 10) || 10;
  const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS, 10) || 5000;
  
  let received = 0;
  console.log('Using SYNCHRONOUS Pull gRPC method');
  console.log('Polling for messages on subscription:', subscriptionName);

  while (received < pullLimit) {
    try {
      console.log('Polling for messages...');
      
      // Use our custom synchronous pull method
      const messages = await client.pullSync(subscriptionName, {
        maxMessages: Math.min(maxMessages, pullLimit - received),
        returnImmediately: true
      });

      if (messages.length === 0) {
        console.log('No messages received, waiting...');
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      const ackIds = [];
      for (const receivedMessage of messages) {
        received++;
        const message = receivedMessage.message;
        console.log('Received message:', receivedMessage.ackId);
        console.log('Data:', message.data.toString());
        ackIds.push(receivedMessage.ackId);
        
        if (received >= pullLimit) break;
      }

      if (ackIds.length > 0) {
        await client.acknowledge(subscriptionName, ackIds);
        console.log('Acknowledged', ackIds.length, 'message(s)');
      }

    } catch (error) {
      console.error('Error:', error.message);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }
  
  console.log('Processed', received, 'messages. Exiting.');
  await client.close();
}

pollForMessages().catch(console.error);
