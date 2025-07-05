const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints...\n');
  
  const endpoints = [
    { name: 'Health Check', path: '/health', method: 'GET' },
    { name: 'Server Status', path: '/status', method: 'GET' },
    { name: 'Database Test', path: '/api/import-logs/test', method: 'GET' },
    { name: 'Import Logs', path: '/api/import-logs?page=1&limit=5', method: 'GET' },
    { name: 'Import Stats', path: '/api/import-logs/stats/overview?days=7', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.path}`,
        timeout: 10000
      });
      
      console.log(`✅ ${endpoint.name} - Status: ${response.status}`);
      
      if (endpoint.name === 'Database Test') {
        console.log(`   MongoDB: ${response.data.data.mongodb}`);
        console.log(`   ReadyState: ${response.data.data.readyState}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${endpoint.name} - Error: ${error.response?.status || error.code}`);
      console.log(`   Message: ${error.response?.data?.error || error.message}`);
      console.log('');
    }
  }
  
  console.log('🎉 API endpoint tests completed');
}

// Run the test
testAPIEndpoints().catch(console.error); 