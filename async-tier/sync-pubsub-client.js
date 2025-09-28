// Custom synchronous Pull implementation
// This creates a wrapper around the high-level PubSub client that exposes 
// the low-level synchronous pull method properly

const {PubSub} = require('@google-cloud/pubsub');

class SyncPubSubClient {
  constructor(options = {}) {
    this.pubsub = new PubSub(options);
    
    // Get the low-level subscriber client
    this._subscriberClient = null;
  }

  async _getSubscriberClient() {
    if (!this._subscriberClient) {
      // Access the internal subscriber client from the high-level client
      // Use promise-based getClient_ method
      this._subscriberClient = await new Promise((resolve, reject) => {
        this.pubsub.getClient_({
          client: 'SubscriberClient'
        }, (err, client) => {
          if (err) reject(err);
          else resolve(client);
        });
      });
    }
    return this._subscriberClient;
  }

  /**
   * Perform a synchronous pull operation using the true Pull gRPC method
   * @param {string} subscriptionName - Name of the subscription
   * @param {Object} options - Pull options
   * @param {number} options.maxMessages - Maximum messages to pull
   * @param {boolean} options.returnImmediately - Whether to return immediately
   * @returns {Promise<Array>} Array of received messages
   */
  async pullSync(subscriptionName, options = {}) {
    const client = await this._getSubscriberClient();
    const projectId = this.pubsub.projectId;
    
    // Build the full subscription path
    const subscriptionPath = client.subscriptionPath(projectId, subscriptionName);
    
    const request = {
      subscription: subscriptionPath,
      maxMessages: options.maxMessages || 10,
      returnImmediately: options.returnImmediately !== false
    };

    // Use the synchronous Pull gRPC method
    const [response] = await client.pull(request);
    return response.receivedMessages || [];
  }

  /**
   * Acknowledge messages
   * @param {string} subscriptionName - Name of the subscription  
   * @param {Array<string>} ackIds - Acknowledgment IDs to ack
   */
  async acknowledge(subscriptionName, ackIds) {
    const client = await this._getSubscriberClient();
    const projectId = this.pubsub.projectId;
    const subscriptionPath = client.subscriptionPath(projectId, subscriptionName);

    await client.acknowledge({
      subscription: subscriptionPath,
      ackIds: ackIds
    });
  }

  async close() {
    if (this._subscriberClient) {
      await this._subscriberClient.close();
    }
  }
}

module.exports = { SyncPubSubClient };