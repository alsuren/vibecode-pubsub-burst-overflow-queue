// Google Pub/Sub Pull Consumer using true synchronous Pull gRPC method
// Uses custom SyncPubSubClient wrapper to access low-level pull() correctly

const { SyncPubSubClient } = require('./sync-pubsub-client');

const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'test-sub';
const overflowSubscriptionName = process.env.PUBSUB_OVERFLOW_SUBSCRIPTION || 'test-overflow-sub';

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
  console.log('Polling for messages on subscriptions:', subscriptionName, '(normal) and', overflowSubscriptionName, '(overflow)');

  while (received < pullLimit) {
    try {
      console.log('Polling for messages from normal queue...');
      
      // First, try to pull from the normal subscription
      const messages = await client.pullSync(subscriptionName, {
        maxMessages: Math.min(maxMessages, pullLimit - received),
        returnImmediately: true
      });

      let messagesToProcess = messages;
      let currentQueue = 'normal';

      // If no messages from normal queue, check overflow queue
      if (messages.length === 0) {
        console.log('No messages in normal queue, checking overflow queue...');
        const overflowMessages = await client.pullSync(overflowSubscriptionName, {
          maxMessages: Math.min(maxMessages, pullLimit - received),
          returnImmediately: true
        });
        messagesToProcess = overflowMessages;
        currentQueue = 'overflow';
      }

      if (messagesToProcess.length === 0) {
        console.log('No messages in either queue, waiting...');
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      const ackIds = [];
      const currentSubscription = currentQueue === 'normal' ? subscriptionName : overflowSubscriptionName;
      
      for (const receivedMessage of messagesToProcess) {
        received++;
        const message = receivedMessage.message;
        const receivedAt = new Date();
        
        // Parse message data to extract timestamp and calculate traversal time
        let messageData, traversalTime, messageTimestamp;
        try {
          const dataString = message.data.toString();
          
          // Try to parse as JSON (from our GUI)
          try {
            const parsed = JSON.parse(dataString);
            messageData = parsed.content || dataString;
            messageTimestamp = new Date(parsed.timestamp);
            traversalTime = receivedAt - messageTimestamp;
          } catch {
            // Fallback for plain text messages
            messageData = dataString;
            messageTimestamp = null;
            traversalTime = null;
          }
        } catch (error) {
          messageData = 'Unable to parse message data';
          messageTimestamp = null;
          traversalTime = null;
        }
        
        console.log(`\n📨 Message from ${currentQueue.toUpperCase()} queue:`);
        console.log(`   ID: ${receivedMessage.ackId}`);
        console.log(`   Content: ${messageData}`);
        
        if (messageTimestamp && traversalTime !== null) {
          console.log(`   📅 Published: ${messageTimestamp.toISOString()}`);
          console.log(`   📨 Received: ${receivedAt.toISOString()}`);
          console.log(`   ⏱️  Queue traversal time: ${traversalTime}ms`);
          
          if (traversalTime > 5000) {
            console.log(`   ⚠️  HIGH LATENCY: Message was in queue for ${(traversalTime/1000).toFixed(1)}s`);
          }
        }
        
        ackIds.push(receivedMessage.ackId);
        
        if (received >= pullLimit) break;
      }

      if (ackIds.length > 0) {
        await client.acknowledge(currentSubscription, ackIds);
        console.log(`Acknowledged ${ackIds.length} message(s) from ${currentQueue} queue`);
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
