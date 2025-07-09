const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabaseIndexes() {
  try {
    console.log('🔧 Fixing Database Indexes...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get the jobs collection
    const db = mongoose.connection.db;
    const jobsCollection = db.collection('jobs');
    
    console.log('1. Checking existing indexes...');
    const indexes = await jobsCollection.indexes();
    console.log('   Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${JSON.stringify(index.key)} - ${index.unique ? 'UNIQUE' : 'NON-UNIQUE'}`);
    });
    
    console.log('\n2. Looking for problematic guid index...');
    const guidIndex = indexes.find(index => 
      Object.keys(index.key).includes('guid') || 
      Object.keys(index.key).includes('originalGuid')
    );
    
    if (guidIndex) {
      console.log(`   Found problematic index: ${JSON.stringify(guidIndex.key)}`);
      
      if (guidIndex.unique) {
        console.log('   This is a UNIQUE index that might be causing issues');
        
        // Drop the problematic index
        console.log('\n3. Dropping problematic index...');
        try {
          // Try to drop by the actual index name
          await jobsCollection.dropIndex('guid_1');
          console.log('   ✅ Dropped index: guid_1');
        } catch (dropError) {
          console.log('   ⚠️ Could not drop index by name, trying by specification...');
          try {
            await jobsCollection.dropIndex({ guid: 1 });
            console.log('   ✅ Dropped index by specification');
          } catch (specError) {
            console.log('   ❌ Could not drop index:', specError.message);
          }
        }
      }
    } else {
      console.log('   No problematic guid index found');
    }
    
    console.log('\n4. Creating proper indexes...');
    
    // Create text index for search
    try {
      await jobsCollection.createIndex(
        { title: 'text', description: 'text', company: 'text' },
        { name: 'text_search' }
      );
      console.log('   ✅ Created text search index');
    } catch (error) {
      console.log('   ⚠️ Text search index already exists or failed:', error.message);
    }
    
    // Create compound index for originalGuid and sourceFeed (for duplicate detection)
    try {
      await jobsCollection.createIndex(
        { originalGuid: 1, sourceFeed: 1 },
        { name: 'originalGuid_sourceFeed', unique: false }
      );
      console.log('   ✅ Created originalGuid + sourceFeed index');
    } catch (error) {
      console.log('   ⚠️ originalGuid index already exists or failed:', error.message);
    }
    
    // Create other useful indexes
    const usefulIndexes = [
      { createdAt: -1 },
      { publishedDate: -1 },
      { location: 1, type: 1 },
      { company: 1, createdAt: -1 },
      { category: 1, industry: 1 },
      { status: 1 }
    ];
    
    for (const indexSpec of usefulIndexes) {
      try {
        const indexName = Object.keys(indexSpec).join('_');
        await jobsCollection.createIndex(indexSpec, { name: indexName });
        console.log(`   ✅ Created index: ${indexName}`);
      } catch (error) {
        console.log(`   ⚠️ Index already exists: ${Object.keys(indexSpec).join('_')}`);
      }
    }
    
    console.log('\n5. Final index check...');
    const finalIndexes = await jobsCollection.indexes();
    console.log('   Updated indexes:');
    finalIndexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${JSON.stringify(index.key)} - ${index.unique ? 'UNIQUE' : 'NON-UNIQUE'}`);
    });
    
    console.log('\n🎉 Database indexes fixed!');
    console.log('   You can now run imports without duplicate key errors.');
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

fixDatabaseIndexes(); 