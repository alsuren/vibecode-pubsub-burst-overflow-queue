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

# Create topic and subscription
echo "🏗️  Creating topic and subscription..."
node -e "
const {PubSub} = require('@google-cloud/pubsub'); 
const pubsub = new PubSub({ projectId: 'test-project' }); 
pubsub.createTopic('test-topic')
  .then(() => pubsub.topic('test-topic').createSubscription('test-sub'))
  .then(() => console.log('✅ Created test-topic and test-sub'))
  .catch(console.error);
"

# Publish test message
echo "📤 Publishing test message..."
node publish-test.js

# Test consumer with PULL_LIMIT=1
echo "📥 Testing consumer (will process 1 message and exit)..."
PULL_LIMIT=1 node pubsub-pull-consumer.js

echo "🎉 End-to-end test completed successfully!"