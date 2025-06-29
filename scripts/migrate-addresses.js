import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Address from '../models/address.js';

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Migration function
const migrateAddresses = async () => {
  try {
    console.log('🚀 Starting address migration...\n');
    
    // Get all users with address data
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    let migrationStats = {
      totalUsers: users.length,
      usersWithLegacyAddress: 0,
      usersWithEmbeddedAddresses: 0,
      addressesMigrated: 0,
      errors: []
    };
    
    for (const user of users) {
      console.log(`Processing user: ${user.firstName} ${user.lastName} (${user.email})`);
      
      let userAddresses = [];
      
      // Check for legacy single address
      if (user.address && (user.address.street || user.address.city || user.address.province)) {
        migrationStats.usersWithLegacyAddress++;
        
        const legacyAddress = {
          userId: user._id,
          type: 'Home',
          isPrimary: true,
          fullName: `${user.firstName} ${user.lastName}`,
          street: user.address.street || '',
          barangay: user.address.barangay || '',
          city: user.address.city || '',
          province: user.address.province || '',
          postalCode: user.address.postalCode || '',
          country: user.address.country || 'Philippines',
          phone: user.phoneNumber || '',
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date()
        };
        
        userAddresses.push(legacyAddress);
        console.log(`  ✓ Found legacy address: ${legacyAddress.street}, ${legacyAddress.city}`);
      }
      
      // Check for embedded addresses array
      if (user.addresses && Array.isArray(user.addresses) && user.addresses.length > 0) {
        migrationStats.usersWithEmbeddedAddresses++;
        
        for (const embeddedAddr of user.addresses) {
          const migratedAddress = {
            userId: user._id,
            type: embeddedAddr.type || 'Home',
            isPrimary: embeddedAddr.isPrimary || false,
            fullName: embeddedAddr.fullName || `${user.firstName} ${user.lastName}`,
            street: embeddedAddr.street || '',
            barangay: embeddedAddr.barangay || '',
            city: embeddedAddr.city || '',
            province: embeddedAddr.province || '',
            phone: embeddedAddr.phone || user.phoneNumber || '',
            createdAt: embeddedAddr.createdAt || user.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          userAddresses.push(migratedAddress);
          console.log(`  ✓ Found embedded address: ${migratedAddress.street}, ${migratedAddress.city}`);
        }
      }
      
      // Migrate addresses to Address collection
      if (userAddresses.length > 0) {
        try {
          // Ensure at least one address is primary
          const hasPrimary = userAddresses.some(addr => addr.isPrimary);
          if (!hasPrimary) {
            userAddresses[0].isPrimary = true;
          }
          
          // Insert addresses
          const insertedAddresses = await Address.insertMany(userAddresses);
          migrationStats.addressesMigrated += insertedAddresses.length;
          
          // Mark user as migrated
          await mongoose.connection.db.collection('users').updateOne(
            { _id: user._id },
            { 
              $set: { addressesMigrated: true },
              $unset: { address: "", addresses: "" }
            }
          );
          
          console.log(`  ✅ Migrated ${insertedAddresses.length} addresses for ${user.firstName} ${user.lastName}`);
        } catch (error) {
          console.log(`  ❌ Error migrating addresses for ${user.firstName} ${user.lastName}:`, error.message);
          migrationStats.errors.push({
            user: `${user.firstName} ${user.lastName} (${user.email})`,
            error: error.message
          });
        }
      } else {
        console.log(`  ⚠️  No addresses found for ${user.firstName} ${user.lastName}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Print migration summary
    console.log('📊 MIGRATION SUMMARY');
    console.log('===================');
    console.log(`Total users processed: ${migrationStats.totalUsers}`);
    console.log(`Users with legacy address: ${migrationStats.usersWithLegacyAddress}`);
    console.log(`Users with embedded addresses: ${migrationStats.usersWithEmbeddedAddresses}`);
    console.log(`Total addresses migrated: ${migrationStats.addressesMigrated}`);
    console.log(`Errors encountered: ${migrationStats.errors.length}`);
    
    if (migrationStats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      migrationStats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.user}: ${error.error}`);
      });
    }
    
    console.log('\n✅ Address migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Search function to find addresses by name or ID
const searchAddresses = async (searchTerm) => {
  try {
    console.log(`🔍 Searching for addresses matching: "${searchTerm}"\n`);
    
    // Try to search by ObjectId first
    let userQuery = {};
    if (mongoose.Types.ObjectId.isValid(searchTerm)) {
      userQuery._id = new mongoose.Types.ObjectId(searchTerm);
    } else {
      // Search by name
      userQuery = {
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { username: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }
    
    // Find matching users
    const users = await User.find(userQuery).select('firstName lastName email username');
    
    if (users.length === 0) {
      console.log('❌ No users found matching the search term.');
      return;
    }
    
    console.log(`Found ${users.length} matching user(s):\n`);
    
    for (const user of users) {
      console.log(`👤 User: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      
      // Get addresses for this user
      const addresses = await Address.findByUserId(user._id);
      
      if (addresses.length > 0) {
        console.log(`   📍 Addresses (${addresses.length}):`);
        addresses.forEach((addr, index) => {
          console.log(`     ${index + 1}. [${addr.type}] ${addr.fullName}`);
          console.log(`        ${addr.street}, ${addr.barangay}, ${addr.city}, ${addr.province}`);
          console.log(`        Phone: ${addr.phone}`);
          console.log(`        Primary: ${addr.isPrimary ? 'Yes' : 'No'}`);
          console.log(`        ID: ${addr._id}`);
        });
      } else {
        console.log('   📍 No addresses found for this user.');
      }
      
      console.log(''); // Empty line
    }
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  const command = process.argv[2];
  const searchTerm = process.argv[3];
  
  switch (command) {
    case 'migrate':
      await migrateAddresses();
      break;
    case 'search':
      if (!searchTerm) {
        console.log('❌ Please provide a search term (name or user ID)');
        console.log('Usage: node migrate-addresses.js search "John Doe"');
        console.log('   or: node migrate-addresses.js search 64f7b1234567890123456789');
        break;
      }
      await searchAddresses(searchTerm);
      break;
    case 'help':
    default:
      console.log('🏠 Address Migration Tool');
      console.log('========================');
      console.log('Commands:');
      console.log('  migrate  - Migrate addresses from User collection to Address collection');
      console.log('  search   - Search for addresses by user name or ID');
      console.log('  help     - Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node migrate-addresses.js migrate');
      console.log('  node migrate-addresses.js search "John Doe"');
      console.log('  node migrate-addresses.js search john@example.com');
      console.log('  node migrate-addresses.js search 64f7b1234567890123456789');
      break;
  }
  
  mongoose.disconnect();
};

main().catch(console.error);
