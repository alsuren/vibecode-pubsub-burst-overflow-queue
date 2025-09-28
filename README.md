# Vibecode Pub/Sub Burst Overflow Queue

A multi-tier application demonstrating Google Cloud Pub/Sub message processing with a React frontend and Node.js async consumer backend.

## Project Structure

```
├── web-tier/          # React frontend application
├── async-tier/        # Node.js Pub/Sub consumer service  
├── package.json       # Root workspace configuration
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for local Pub/Sub emulator)

### Installation
```bash
# Install all dependencies for both tiers
npm run install:all
```

### Development

**Start the web application:**
```bash
npm run start:web
# or
npm start
```

**Start the async consumer:**
```bash
npm run start:async
```

**Run both simultaneously:**
```bash
npm run dev
```

### Testing

**Test everything:**
```bash
npm test
```

**Test individual tiers:**
```bash
npm run test:web
npm run test:async
```

**Start Pub/Sub emulator:**
```bash
npm run emulator
```

## Tiers

### Web Tier (`web-tier/`)
- React application built with Vite
- Provides frontend interface
- See [`web-tier/README.md`](web-tier/README.md) for details

### Async Tier (`async-tier/`)
- Node.js Pub/Sub consumer service with **burst overflow queue support**
- Uses **synchronous Pull gRPC method** (not StreamingPull)
- Dual queue processing: normal queue with overflow fallback
- Includes local emulator support for offline development
- Custom `SyncPubSubClient` wrapper for true polling behavior
- See [`async-tier/README.md`](async-tier/README.md) for details

## Key Features

- **Burst Overflow Queue**: Dual queue system where overflow queue is only consumed when normal queue is empty
- **True Synchronous Polling**: Custom wrapper around Google Cloud Pub/Sub that exposes the synchronous Pull gRPC method instead of StreamingPull
- **Local Development**: Docker-based Pub/Sub emulator for offline testing
- **Automated Testing**: End-to-end tests with emulator setup and teardown
- **Workspace Management**: npm workspaces for coordinated development

## Environment Variables

### Async Tier
- `PUBSUB_PROJECT_ID`: Google Cloud project ID (default: 'test-project')
- `PUBSUB_SUBSCRIPTION`: Normal queue subscription name (default: 'test-sub')
- `PUBSUB_OVERFLOW_SUBSCRIPTION`: Overflow queue subscription name (default: 'test-overflow-sub')
- `PUBSUB_EMULATOR_HOST`: Emulator endpoint (auto-detected)
- `PULL_LIMIT`: Max messages before exit (default: infinite)
- `MAX_MESSAGES_PER_POLL`: Messages per pull request (default: 10)
- `POLL_INTERVAL_MS`: Polling interval when no messages (default: 5000)

## Development Workflow

1. **Setup**: `npm run install:all`
2. **Start emulator**: `npm run emulator`
3. **Run tests**: `npm run test:async`
4. **Develop**: `npm run dev` (starts both tiers)

## Burst Overflow Queue Architecture

The consumer implements a dual-queue system for handling message bursts:

1. **Normal Queue**: Primary queue that is always checked first
2. **Overflow Queue**: Secondary queue that is only checked when normal queue returns zero messages

### Processing Logic:
```
1. Poll normal queue with synchronous Pull
2. If messages.length === 0:
   - Poll overflow queue with synchronous Pull  
3. Process messages from whichever queue had data
4. Acknowledge messages to the correct subscription
```

This design ensures:
- Normal operations use the primary queue exclusively
- Overflow capacity is available during traffic spikes
- No unnecessary polling of overflow queue during normal load
- Clean separation of normal vs burst traffic

## Architecture Notes

The async tier implements a custom `SyncPubSubClient` that bypasses the Google Cloud Pub/Sub library's default StreamingPull behavior to provide true synchronous, one-shot message pulling. This is ideal for batch processing scenarios where you want explicit control over when messages are pulled rather than maintaining persistent connections.