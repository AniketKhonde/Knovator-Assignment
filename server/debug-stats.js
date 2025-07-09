const mongoose = require('mongoose');
require('dotenv').config();

const ImportLog = require('./src/models/ImportLog');
const Job = require('./src/models/Job');

async function debugStats() {
  try {
    console.log('🔍 Debugging Import Stats...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check ImportLogs
    console.log('1. Import Logs Analysis:');
    const totalImportLogs = await ImportLog.countDocuments();
    console.log(`   Total Import Logs: ${totalImportLogs}`);
    
    const completedImportLogs = await ImportLog.countDocuments({ status: 'completed' });
    console.log(`   Completed Import Logs: ${completedImportLogs}`);
    
    const failedImportLogs = await ImportLog.countDocuments({ status: 'failed' });
    console.log(`   Failed Import Logs: ${failedImportLogs}`);
    
    const runningImportLogs = await ImportLog.countDocuments({ status: 'running' });
    console.log(`   Running Import Logs: ${runningImportLogs}\n`);
    
    // Check Jobs
    console.log('2. Jobs Analysis:');
    const totalJobs = await Job.countDocuments();
    console.log(`   Total Jobs in Database: ${totalJobs}`);
    
    const activeJobs = await Job.countDocuments({ status: 'active' });
    console.log(`   Active Jobs: ${activeJobs}`);
    
    const inactiveJobs = await Job.countDocuments({ status: 'inactive' });
    console.log(`   Inactive Jobs: ${inactiveJobs}\n`);
    
    // Check recent import logs
    console.log('3. Recent Import Logs (Last 5):');
    const recentLogs = await ImportLog.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .select('timestamp sourceName totalFetched totalImported newJobs updatedJobs status');
    
    recentLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.sourceName} - ${log.status}`);
      console.log(`      Fetched: ${log.totalFetched}, Imported: ${log.totalImported}`);
      console.log(`      New: ${log.newJobs}, Updated: ${log.updatedJobs}`);
      console.log(`      Time: ${log.timestamp.toLocaleString()}\n`);
    });
    
    // Check job sources
    console.log('4. Jobs by Source:');
    const jobSources = await Job.aggregate([
      {
        $group: {
          _id: '$sourceName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    jobSources.forEach(source => {
      console.log(`   ${source._id}: ${source.count} jobs`);
    });
    
    console.log('\n5. Import Stats Calculation:');
    const stats = await ImportLog.getStats(7); // Last 7 days
    console.log('   Stats from getStats(7):', stats);
    
    console.log('\n🎯 Summary:');
    console.log(`   - Import Logs show ${completedImportLogs} successful imports`);
    console.log(`   - But only ${totalJobs} jobs are actually in the database`);
    console.log(`   - This suggests jobs are being processed but not saved properly`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugStats(); 