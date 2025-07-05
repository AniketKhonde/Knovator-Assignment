const { connectRedis, getRedisStatus, disconnectRedis } = require('./src/config/redis');
const queueService = require('./src/services/queueService');
const logger = require('./src/utils/logger');

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection and queue operations...\n');
  
  try {
    // Test Redis connection
    console.log('1. Testing Redis connection...');
    await connectRedis();
    const redisStatus = getRedisStatus();
    console.log('✅ Redis Status:', redisStatus);
    
    // Test queue service initialization
    console.log('\n2. Testing queue service initialization...');
    await queueService.initialize();
    console.log('✅ Queue service initialized');
    
    // Test queue creation
    console.log('\n3. Testing queue creation...');
    const queue = queueService.getQueue('test-queue');
    console.log('✅ Test queue created');
    
    // Test queue stats
    console.log('\n4. Testing queue stats...');
    const stats = await queueService.getQueueStats('test-queue');
    console.log('✅ Queue stats:', stats);
    
    // Test health check
    console.log('\n5. Testing health check...');
    const health = await queueService.healthCheck();
    console.log('✅ Health check:', health);
    
    // Test adding a job
    console.log('\n6. Testing job addition...');
    const job = await queueService.addJob('test-queue', { test: 'data' });
    console.log('✅ Job added:', job.id);
    
    // Test getting updated stats
    console.log('\n7. Testing updated queue stats...');
    const updatedStats = await queueService.getQueueStats('test-queue');
    console.log('✅ Updated stats:', updatedStats);
    
    console.log('\n🎉 All tests passed! Redis and queue operations are working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Show Redis status even if tests failed
    try {
      const redisStatus = getRedisStatus();
      console.log('\n📊 Current Redis status:', redisStatus);
    } catch (statusError) {
      console.log('\n📊 Could not get Redis status:', statusError.message);
    }
  } finally {
    // Cleanup
    try {
      await disconnectRedis();
      console.log('\n🧹 Cleanup completed');
    } catch (cleanupError) {
      console.log('\n⚠️ Cleanup error:', cleanupError.message);
    }
  }
}

// Run the test
testRedisConnection(); 