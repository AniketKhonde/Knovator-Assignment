# Knovator Job Importer

An automated job import system that fetches job listings from XML feed APIs, processes them through BullMQ queues, and provides real-time monitoring with comprehensive import history tracking.

## 🏗️ Project Structure

```
Knovator-Assignment/
├── client/                 # Next.js frontend (admin dashboard)
├── server/                 # Node.js + Express.js backend
├── docs/                   # System architecture documentation
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Redis (local or Redis Cloud)
- npm or yarn

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Knovator-Assignment
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/knovator-jobs
# Or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/knovator-jobs

# Redis Configuration
REDIS_URL=redis://localhost:6379
# Or for Redis Cloud: redis://username:password@host:port

# Job Import Configuration
BATCH_SIZE=50
CONCURRENCY=5
CRON_SCHEDULE="0 * * * *"  # Every hour

# API Configuration
REQUEST_TIMEOUT=30000
```

### 3. Frontend Setup

```bash
cd ../client
npm install
```

Create a `.env.local` file in the client directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 4. Start Services

#### Option A: Using Docker (Recommended)

```bash
# Start MongoDB and Redis with Docker
docker-compose up -d

# Start Backend
cd server
npm start

# Start Frontend (in new terminal)
cd client
npm run dev
```

#### Option B: Local Installation

1. **MongoDB**: Install and start MongoDB service
2. **Redis**: Install and start Redis service
3. **Backend**: `cd server && npm start`
4. **Frontend**: `cd client && npm run dev`

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔧 Features

### Core Functionality
- ✅ **Automated XML Feed Processing**: Fetches jobs from multiple XML APIs
- ✅ **BullMQ Queue System**: Scalable job processing with Redis
- ✅ **Cron Automation**: Scheduled imports every minute
- ✅ **Real-time Updates**: Socket.IO for live status updates
- ✅ **Import History**: Comprehensive logging and statistics

### Admin Dashboard
- ✅ **Real-time Status**: Live import status and queue statistics
- ✅ **Import Logs**: Complete history with pagination and filters
- ✅ **Statistics Overview**: 7-day import statistics
- ✅ **Queue Monitoring**: BullMQ queue status and processing stats

### System Architecture
- ✅ **Microservices Ready**: Clean separation of concerns
- ✅ **Error Handling**: Comprehensive error logging and recovery
- ✅ **Scalable**: Queue-based processing for high throughput
- ✅ **Monitoring**: Real-time system health and performance

## 📊 API Sources

The system automatically fetches jobs from these XML feeds:
- Jobicy.com (multiple categories)
- HigherEdJobs.com
- Additional feeds configurable via environment variables

## 🛠️ Development

### Backend Commands

```bash
cd server

# Development
npm run dev

# Production
npm start

# Run tests
npm test
```

### Frontend Commands

```bash
cd client

# Development
npm run dev

# Production build
npm run build
npm start
```

## 📁 API Endpoints

### System Status
- `GET /health` - Health check
- `GET /api/import/status` - System status with queue statistics

### Import Logs
- `GET /api/import-logs` - Get import history with pagination and filters
- `GET /api/import-logs/stats/overview` - Get import statistics

## 🔍 Monitoring

### Import Logs Structure
Each import run logs:
- `timestamp`: Import start time
- `sourceName`: Feed source name
- `totalFetched`: Total jobs fetched from APIs
- `totalImported`: Successfully processed jobs
- `newJobs`: New jobs inserted
- `updatedJobs`: Existing jobs updated
- `status`: Import status (running/completed/failed)
- `duration`: Import duration in milliseconds

### Real-time Updates
The frontend receives real-time updates via Socket.IO when:
- Import starts
- Import progress updates
- Import completes
- System status changes

### Queue Statistics
- `waiting`: Jobs waiting to be processed
- `active`: Currently processing jobs
- `completed`: Successfully completed jobs
- `failed`: Failed jobs
- `delayed`: Delayed jobs

## 🧪 Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

## 📈 Performance

- **Queue Processing**: 5 concurrent workers
- **Import Frequency**: Every minute (configurable)
- **Error Recovery**: Automatic retry with exponential backoff
- **Memory Efficient**: Stream-based XML processing

## 🔒 Security

- CORS protection
- Request rate limiting
- Input validation
- Error message sanitization
- Environment-based configuration

## 📝 License

MIT License - see LICENSE file for details
