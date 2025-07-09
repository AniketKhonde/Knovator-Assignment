// Simple test script to verify manual import functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testManualImport() {
  try {
    console.log('🧪 Testing Manual Import Functionality...\n');
    
    // Test 1: Check if server is running
    console.log('1. Checking server status...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data);
    
    // Test 2: Check current import status
    console.log('\n2. Checking current import status...');
    const statusResponse = await axios.get(`${API_BASE_URL}/api/import/status`);
    console.log('✅ Import status:', statusResponse.data.data.import);
    
    // Test 3: Start manual import
    console.log('\n3. Starting manual import...');
    const importResponse = await axios.post(`${API_BASE_URL}/api/import/start`);
    console.log('✅ Manual import started:', importResponse.data);
    
    // Test 4: Check status again after starting
    console.log('\n4. Checking status after starting import...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const statusAfterResponse = await axios.get(`${API_BASE_URL}/api/import/status`);
    console.log('✅ Status after starting:', statusAfterResponse.data.data.import);
    
    console.log('\n🎉 All tests passed! Manual import functionality is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm start');
    }
  }
}

// Run the test
testManualImport(); 