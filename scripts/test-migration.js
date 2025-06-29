import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test connection
const testConnection = async () => {
  try {
    console.log('🧪 Testing database connection...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Connected to: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Test if Address model can be imported
    try {
      const Address = (await import('../models/address.js')).default;
      console.log('✅ Address model imported successfully');
      console.log(`📋 Address collection: ${Address.collection.name}`);
    } catch (error) {
      console.log('❌ Error importing Address model:', error.message);
    }
    
    // Test if User model still works
    try {
      const User = (await import('../models/User.js')).default;
      console.log('✅ User model imported successfully');
      console.log(`📋 User collection: ${User.collection.name}`);
      
      // Count existing users
      const userCount = await User.countDocuments();
      console.log(`👥 Total users in database: ${userCount}`);
      
      // Check if any users have old address data
      const usersWithLegacyAddress = await mongoose.connection.db.collection('users').countDocuments({
        $or: [
          { 'address.street': { $exists: true, $ne: '' } },
          { 'addresses.0': { $exists: true } }
        ]
      });
      console.log(`📮 Users with address data to migrate: ${usersWithLegacyAddress}`);
      
    } catch (error) {
      console.log('❌ Error with User model:', error.message);
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run migration: node scripts/migrate-addresses.js migrate');
    console.log('2. Search addresses: node scripts/migrate-addresses.js search "John"');
    console.log('3. Test admin dashboard address management');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
  } finally {
    mongoose.disconnect();
  }
};

testConnection();
