// Publishes a test message to the local Pub/Sub emulator
// Usage: node publish-test.js

const { PubSub } = require('@google-cloud/pubsub');

const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
const topicName = process.env.PUBSUB_TOPIC || 'test-topic';

async function main() {
  const pubsub = new PubSub({ projectId });
  let topic = pubsub.topic(topicName);
  // Create topic if it doesn't exist
  const [exists] = await topic.exists();
  if (!exists) {
    await pubsub.createTopic(topicName);
    console.log('Created topic:', topicName);
  }
  const dataBuffer = Buffer.from('Hello, world!');
  const messageId = await topic.publish(dataBuffer);
  console.log(`Message ${messageId} published.`);
}

main().catch(console.error);
