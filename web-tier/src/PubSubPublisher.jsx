import { useState, useEffect } from 'react';
import './PubSubPublisher.css';

function PubSubPublisher() {
  const [streamStatus, setStreamStatus] = useState({});
  const [publishStatus, setPublishStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check stream status on component mount and periodically
  const checkStreamStatus = async () => {
    try {
      const response = await fetch('/api/publish/stream/status');
      const data = await response.json();
      setStreamStatus(data.streams);
    } catch (error) {
      console.error('Error checking stream status:', error);
    }
  };

  useEffect(() => {
    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePublish = async (type, queue, options = {}) => {
    setIsLoading(true);
    setPublishStatus(`Publishing ${type} message(s) to ${queue} queue...`);

    try {
      let url, method, body;

      switch (type) {
        case 'single':
          url = `/api/publish/single/${queue}`;
          method = 'POST';
          body = JSON.stringify({ content: options.content || 'Single message from GUI' });
          break;
        
        case 'batch':
          url = `/api/publish/batch/${queue}`;
          method = 'POST';
          body = JSON.stringify({ 
            count: options.count || 5, 
            content: options.content || 'Batch message from GUI' 
          });
          break;
        
        case 'stream_start':
          url = `/api/publish/stream/${queue}/start`;
          method = 'POST';
          body = JSON.stringify({ 
            interval: options.interval || 1000,
            content: options.content || 'Stream message from GUI'
          });
          break;
        
        case 'stream_stop':
          url = `/api/publish/stream/${queue}/stop`;
          method = 'POST';
          body = JSON.stringify({});
          break;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const result = await response.json();

      if (result.success) {
        switch (type) {
          case 'single':
            setPublishStatus(`✅ Published 1 message to ${queue} queue (ID: ${result.messageId})`);
            break;
          case 'batch':
            setPublishStatus(`✅ Published ${result.count} messages to ${queue} queue`);
            break;
          case 'stream_start':
            setPublishStatus(`✅ Started streaming to ${queue} queue (every ${options.interval}ms)`);
            break;
          case 'stream_stop':
            setPublishStatus(`✅ Stopped streaming to ${queue} queue`);
            break;
        }
        checkStreamStatus(); // Refresh stream status
      } else {
        setPublishStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setPublishStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const QueueSection = ({ queueName, queueType }) => (
    <div className="queue-section">
      <h3 className={`queue-title ${queueType}`}>
        {queueName} Queue
        {streamStatus[queueType] === 'running' && <span className="streaming-indicator">🔄 Streaming</span>}
      </h3>
      
      <div className="button-group">
        <button 
          onClick={() => handlePublish('single', queueType)}
          disabled={isLoading}
          className="btn btn-single"
        >
          📨 Send Single Message
        </button>
        
        <button 
          onClick={() => handlePublish('batch', queueType, { count: 5 })}
          disabled={isLoading}
          className="btn btn-batch"
        >
          📦 Send Batch (5 messages)
        </button>
        
        <button 
          onClick={() => handlePublish('batch', queueType, { count: 20 })}
          disabled={isLoading}
          className="btn btn-batch-large"
        >
          📦 Send Large Batch (20 messages)
        </button>
      </div>

      <div className="stream-controls">
        {streamStatus[queueType] !== 'running' ? (
          <>
            <button 
              onClick={() => handlePublish('stream_start', queueType, { interval: 2000 })}
              disabled={isLoading}
              className="btn btn-stream-start"
            >
              🚀 Start Stream (2s interval)
            </button>
            <button 
              onClick={() => handlePublish('stream_start', queueType, { interval: 500 })}
              disabled={isLoading}
              className="btn btn-stream-fast"
            >
              ⚡ Start Fast Stream (0.5s)
            </button>
          </>
        ) : (
          <button 
            onClick={() => handlePublish('stream_stop', queueType)}
            disabled={isLoading}
            className="btn btn-stream-stop"
          >
            ⏹️ Stop Stream
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="pubsub-publisher">
      <h1>🚀 Pub/Sub Message Publisher</h1>
      <p className="description">
        Test the burst overflow queue system by sending messages to both normal and overflow queues.
        The consumer will prioritize the normal queue and only check overflow when normal is empty.
      </p>

      {publishStatus && (
        <div className={`status-message ${publishStatus.startsWith('❌') ? 'error' : 'success'}`}>
          {publishStatus}
        </div>
      )}

      <div className="queues-container">
        <QueueSection queueName="Normal" queueType="normal" />
        <QueueSection queueName="Overflow" queueType="overflow" />
      </div>

      <div className="info-section">
        <h4>💡 Tips:</h4>
        <ul>
          <li><strong>Single Message:</strong> Send one message with timestamp</li>
          <li><strong>Batch:</strong> Send multiple messages at once for load testing</li>
          <li><strong>Stream:</strong> Continuously send messages at regular intervals</li>
          <li><strong>Queue Priority:</strong> Consumer checks normal queue first, then overflow</li>
        </ul>
      </div>

      <div className="consumer-info">
        <h4>🔍 To see timing info:</h4>
        <p>Run the consumer: <code>npm run test:async</code> or <code>cd async-tier && node pubsub-pull-consumer.js</code></p>
      </div>
    </div>
  );
}

export default PubSubPublisher;