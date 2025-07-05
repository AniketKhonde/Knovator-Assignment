const axios = require('axios');

const KEEP_ALIVE_CONFIG = {
  url: process.env.KEEP_ALIVE_URL || 'https://knovator-assignment.onrender.com',
  interval: 14 * 60 * 1000, // 14 minutes (Render sleeps after 15 minutes)
  endpoints: ['/keep-alive', '/health', '/'],
  timeout: 10000
};

async function pingServer() {
  for (const endpoint of KEEP_ALIVE_CONFIG.endpoints) {
    try {
      const response = await axios.get(`${KEEP_ALIVE_CONFIG.url}${endpoint}`, {
        timeout: KEEP_ALIVE_CONFIG.timeout
      });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      break; // If one endpoint works, we're good
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

async function startKeepAlive() {
  console.log('🔄 Starting keep-alive service...');
  console.log(`📍 Target: ${KEEP_ALIVE_CONFIG.url}`);
  console.log(`⏰ Interval: ${KEEP_ALIVE_CONFIG.interval / 1000} seconds`);
  
  // Initial ping
  await pingServer();
  
  // Set up periodic pings
  setInterval(pingServer, KEEP_ALIVE_CONFIG.interval);
  
  console.log('✅ Keep-alive service started');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Keep-alive service stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Keep-alive service stopped');
  process.exit(0);
});

// Start the service
startKeepAlive().catch(console.error); 