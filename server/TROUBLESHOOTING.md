# Troubleshooting Guide

## Redis Connection Issues

### Common Error: "Queue stats operation timed out after 5 seconds"

This error occurs when Redis operations are taking too long to complete. Here are the fixes implemented:

### 1. Increased Timeouts

- **Queue Stats Timeout**: Increased from 5 to 15 seconds
- **Queue Add Timeout**: Increased from 10 to 20 seconds
- **Redis Connect Timeout**: Increased from 10 to 15 seconds
- **Redis Command Timeout**: Increased from 5 to 10 seconds

### 2. Individual Operation Timeouts

Each queue operation now has its own 3-second timeout to prevent hanging:
- `getWaiting()`
- `getActive()`
- `getCompleted()`
- `getFailed()`
- `getDelayed()`

### 3. Improved Redis Configuration

- **Keep Alive**: Added 30-second keep-alive
- **Reconnection Strategy**: Improved with exponential backoff
- **Max Retry Attempts**: Increased from 10 to 20
- **Retry Time**: Increased from 1 hour to 2 hours

### 4. Health Check Endpoint

Added `/api/import/health` endpoint to diagnose issues:

```bash
curl http://localhost:5000/api/import/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": "connected",
    "queues": 1,
    "workers": 1,
    "redisStatus": {
      "status": "connected",
      "isReady": true,
      "isOpen": true
    }
  }
}
```

### 5. Test Script

Run the Redis test script to diagnose issues:

```bash
cd server
node test-redis.js
```

## Troubleshooting Steps

### Step 1: Check Redis Connection

1. Verify Redis URL in environment:
   ```bash
   echo $REDIS_URL
   ```

2. Test Redis connection manually:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

### Step 2: Check Queue Health

1. Call the health endpoint:
   ```bash
   curl http://localhost:5000/api/import/health
   ```

2. Check server logs for Redis errors:
   ```bash
   tail -f server/logs/app.log
   ```

### Step 3: Monitor Queue Operations

1. Check queue status:
   ```bash
   curl http://localhost:5000/api/import/status
   ```

2. Look for timeout errors in logs:
   ```bash
   grep "timeout" server/logs/app.log
   ```

### Step 4: Redis Performance Issues

If Redis is slow:

1. **Check Redis Memory Usage**:
   ```bash
   redis-cli -u $REDIS_URL info memory
   ```

2. **Check Redis CPU Usage**:
   ```bash
   redis-cli -u $REDIS_URL info stats
   ```

3. **Clear Old Jobs** (if needed):
   ```bash
   curl -X POST http://localhost:5000/api/import/cleanup
   ```

## Environment Variables

Make sure these are set correctly:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
# For Redis Cloud: redis://username:password@host:port

# Queue Configuration
CONCURRENCY=5
BATCH_SIZE=50

# Timeouts
REQUEST_TIMEOUT=30000
```

## Common Solutions

### 1. Redis Connection Refused

**Cause**: Redis server is not running or wrong URL
**Solution**: 
- Start Redis server
- Check REDIS_URL environment variable
- Verify network connectivity

### 2. Redis Timeout

**Cause**: Redis server is overloaded or slow
**Solution**:
- Check Redis server resources
- Increase timeouts (already done in code)
- Consider Redis cluster for high load

### 3. Queue Operations Hanging

**Cause**: Large number of jobs or slow Redis
**Solution**:
- Reduce batch size
- Increase concurrency
- Monitor Redis performance

### 4. Memory Issues

**Cause**: Too many jobs in queue
**Solution**:
- Clean up old jobs
- Reduce job retention period
- Monitor queue size

## Monitoring

### Key Metrics to Watch

1. **Queue Size**: Number of waiting jobs
2. **Processing Rate**: Jobs completed per minute
3. **Error Rate**: Failed jobs percentage
4. **Redis Response Time**: Ping latency

### Log Patterns

- `Queue stats operation timed out` → Redis performance issue
- `ECONNREFUSED` → Redis connection issue
- `Redis ping timeout` → Redis server overloaded

## Emergency Procedures

### 1. Restart Queue Service

```bash
# Stop the server
pkill -f "node.*server"

# Clear Redis queues (if needed)
redis-cli -u $REDIS_URL FLUSHDB

# Restart server
npm start
```

### 2. Reset Redis Connection

```bash
# Restart Redis server
sudo systemctl restart redis

# Or for Redis Cloud, check service status
```

### 3. Clear All Queues

```bash
# Use the cleanup endpoint
curl -X POST http://localhost:5000/api/import/cleanup
```

## Prevention

1. **Monitor Redis Performance**: Set up alerts for high memory/CPU usage
2. **Regular Cleanup**: Schedule queue cleanup jobs
3. **Load Testing**: Test with expected job volumes
4. **Backup Strategy**: Consider Redis persistence options 