// Setup script to create topics and subscriptions for the web interface
import { PubSub } from '@google-cloud/pubsub';

const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
const pubsub = new PubSub({ projectId });

const topics = [
  { name: 'test-topic', subscription: 'test-sub' },
  { name: 'test-overflow-topic', subscription: 'test-overflow-sub' }
];

async function setupPubSub() {
  console.log('🏗️  Setting up Pub/Sub topics and subscriptions...');
  
  try {
    for (const { name, subscription } of topics) {
      // Create topic if it doesn't exist
      try {
        await pubsub.createTopic(name);
        console.log(`✅ Created topic: ${name}`);
      } catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
          console.log(`ℹ️  Topic already exists: ${name}`);
        } else {
          throw error;
        }
      }
      
      // Create subscription if it doesn't exist
      try {
        await pubsub.topic(name).createSubscription(subscription);
        console.log(`✅ Created subscription: ${subscription}`);
      } catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
          console.log(`ℹ️  Subscription already exists: ${subscription}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('🎉 Pub/Sub setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupPubSub();