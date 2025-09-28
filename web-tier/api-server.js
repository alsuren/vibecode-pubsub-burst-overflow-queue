// Express API server for Pub/Sub message publishing
import express from 'express';
import cors from 'cors';
import { PubSub } from '@google-cloud/pubsub';

const app = express();
const port = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Pub/Sub client
const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
const pubsub = new PubSub({ projectId });

// Topics
const normalTopicName = process.env.PUBSUB_TOPIC || 'test-topic';
const overflowTopicName = process.env.PUBSUB_OVERFLOW_TOPIC || 'test-overflow-topic';

if (process.env.PUBSUB_EMULATOR_HOST) {
  console.log('Using Pub/Sub emulator at', process.env.PUBSUB_EMULATOR_HOST);
}

// Helper function to create message with timestamp
function createMessage(content, messageType = 'single') {
  return {
    data: Buffer.from(JSON.stringify({
      content,
      timestamp: new Date().toISOString(),
      messageType,
      id: Math.random().toString(36).substr(2, 9)
    }))
  };
}

// API Routes

// Publish single message
app.post('/api/publish/single/:queue', async (req, res) => {
  try {
    const { queue } = req.params;
    const { content = 'Single message' } = req.body;
    
    const topicName = queue === 'normal' ? normalTopicName : overflowTopicName;
    const topic = pubsub.topic(topicName);
    
    const message = createMessage(content, 'single');
    const messageId = await topic.publishMessage(message);
    
    res.json({
      success: true,
      messageId,
      queue,
      topic: topicName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publishing single message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Publish batch of messages
app.post('/api/publish/batch/:queue', async (req, res) => {
  try {
    const { queue } = req.params;
    const { count = 5, content = 'Batch message' } = req.body;
    
    const topicName = queue === 'normal' ? normalTopicName : overflowTopicName;
    const topic = pubsub.topic(topicName);
    
    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push(createMessage(`${content} ${i + 1}/${count}`, 'batch'));
    }
    
    const messageIds = await Promise.all(
      messages.map(message => topic.publishMessage(message))
    );
    
    res.json({
      success: true,
      messageIds,
      count: messageIds.length,
      queue,
      topic: topicName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publishing batch:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start/stop streaming messages
const streamingIntervals = new Map();

app.post('/api/publish/stream/:queue/:action', async (req, res) => {
  try {
    const { queue, action } = req.params;
    const { interval = 1000, content = 'Stream message' } = req.body;
    
    const streamKey = `${queue}_stream`;
    
    if (action === 'start') {
      if (streamingIntervals.has(streamKey)) {
        return res.json({ 
          success: false, 
          error: `Stream already running for ${queue} queue` 
        });
      }
      
      const topicName = queue === 'normal' ? normalTopicName : overflowTopicName;
      const topic = pubsub.topic(topicName);
      let messageCount = 0;
      
      const intervalId = setInterval(async () => {
        try {
          messageCount++;
          const message = createMessage(`${content} #${messageCount}`, 'stream');
          await topic.publishMessage(message);
          console.log(`Streamed message #${messageCount} to ${queue} queue`);
        } catch (error) {
          console.error('Stream publish error:', error);
        }
      }, interval);
      
      streamingIntervals.set(streamKey, intervalId);
      
      res.json({
        success: true,
        action: 'started',
        queue,
        topic: topicName,
        interval,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'stop') {
      const intervalId = streamingIntervals.get(streamKey);
      if (intervalId) {
        clearInterval(intervalId);
        streamingIntervals.delete(streamKey);
        res.json({
          success: true,
          action: 'stopped',
          queue,
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          success: false,
          error: `No stream running for ${queue} queue`
        });
      }
    } else {
      res.status(400).json({ error: 'Action must be "start" or "stop"' });
    }
  } catch (error) {
    console.error('Error managing stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stream status
app.get('/api/publish/stream/status', (req, res) => {
  const streams = {};
  for (const [key] of streamingIntervals) {
    const queue = key.replace('_stream', '');
    streams[queue] = 'running';
  }
  
  res.json({
    streams,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    pubsubEmulator: process.env.PUBSUB_EMULATOR_HOST || 'not set'
  });
});

// Cleanup on shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down API server...');
  for (const intervalId of streamingIntervals.values()) {
    clearInterval(intervalId);
  }
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Pub/Sub API server running on port ${port}`);
  console.log(`Topics: ${normalTopicName} (normal), ${overflowTopicName} (overflow)`);
});