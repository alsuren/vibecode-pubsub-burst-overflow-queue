#!/bin/bash
# End-to-end test script for Pub/Sub consumer
# This script starts the emulator, creates topic/subscription, publishes a message, and tests the consumer

set -e  # Exit on error

echo "🚀 Starting Pub/Sub end-to-end test..."

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    docker rm -f pubsub-emulator >/dev/null 2>&1 || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start emulator
echo "📡 Starting Pub/Sub emulator..."
node start-emulator-docker.js

# Wait for emulator to be ready
echo "⏳ Waiting for emulator to start..."
sleep 5

# Set environment variables
export PUBSUB_EMULATOR_HOST=localhost:8085

# Create topics and subscriptions
echo "🏗️  Creating topics and subscriptions..."
node -e "
const {PubSub} = require('@google-cloud/pubsub'); 
const pubsub = new PubSub({ projectId: 'test-project' }); 
Promise.all([
  pubsub.createTopic('test-topic').catch(() => {}),
  pubsub.createTopic('test-overflow-topic').catch(() => {})
])
  .then(() => Promise.all([
    pubsub.topic('test-topic').createSubscription('test-sub').catch(() => {}),
    pubsub.topic('test-overflow-topic').createSubscription('test-overflow-sub').catch(() => {})
  ]))
  .then(() => console.log('✅ Created normal and overflow topics/subscriptions'))
  .catch(console.error);
"

# Test normal queue behavior
echo "📤 Publishing test message to normal queue..."
node publish-test.js

echo "📥 Testing consumer with normal queue message (will process 1 message and exit)..."
PULL_LIMIT=1 node pubsub-pull-consumer.js

# Test overflow queue behavior  
echo "� Publishing test message to overflow queue only..."
node -e "
const {PubSub} = require('@google-cloud/pubsub'); 
const pubsub = new PubSub({ projectId: 'test-project' }); 
const dataBuffer = Buffer.from('Hello from overflow queue!');
pubsub.topic('test-overflow-topic').publishMessage({data: dataBuffer})
  .then(() => console.log('Message published to overflow topic.'))
  .catch(console.error);
"

echo "�📥 Testing consumer with overflow queue fallback (will process 1 message and exit)..."
PULL_LIMIT=1 node pubsub-pull-consumer.js

echo "🎉 End-to-end test completed successfully!"